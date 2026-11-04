const decodeBase64Url = (value) => {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "="));
  return Uint8Array.from(binary, c => c.charCodeAt(0));
};

const readTlv = (bytes, offset) => {
  const tag = bytes[offset];
  let length = bytes[offset + 1];
  let header = 2;
  if (length & 0x80) {
    const count = length & 0x7f;
    length = 0;
    for (let i = 0; i < count; i++) length = length * 256 + bytes[offset + 2 + i];
    header += count;
  }
  return { tag, start: offset, contentStart: offset + header, end: offset + header + length };
};

const pemToSpki = (pem) => {
  const base64 = pem.replace(/-----BEGIN CERTIFICATE-----|-----END CERTIFICATE-----|\\s/g, "");
  const der = decodeBase64Url(btoa(String.fromCharCode(...Uint8Array.from(atob(base64), c => c.charCodeAt(0))))
    .replace(/=/g, ""));
  const certificate = readTlv(der, 0);
  const tbs = readTlv(der, certificate.contentStart);
  let cursor = tbs.contentStart;
  const fields = [];
  while (cursor < tbs.end) {
    const field = readTlv(der, cursor);
    fields.push(field);
    cursor = field.end;
  }
  const spki = fields[fields[0]?.tag === 0xa0 ? 6 : 5];
  if (!spki || spki.tag !== 0x30) throw new Error("Invalid Access certificate");
  return der.slice(spki.start, spki.end);
};

let cachedCerts;
let cachedAt = 0;

async function getAccessCerts(issuer) {
  if (cachedCerts && Date.now() - cachedAt < 300000) return cachedCerts;
  const response = await fetch(`${issuer}/cdn-cgi/access/certs`);
  if (!response.ok) throw new Error("Could not load Access signing certificates");
  const data = await response.json();
  cachedCerts = data.public_certs || [];
  cachedAt = Date.now();
  return cachedCerts;
}

export async function requireAdmin(request, env) {
  const team = String(env.ACCESS_TEAM_DOMAIN || "").replace(/^https?:\\/\\//, "").replace(/\\/$/, "");
  const audience = String(env.ACCESS_AUD || "");
  if (!team || !audience) return { ok: false, response: new Response("Admin access is not configured", { status: 503 }) };

  const token = request.headers.get("Cf-Access-Jwt-Assertion");
  if (!token) return { ok: false, response: new Response("Unauthorized", { status: 401 }) };

  try {
    const parts = token.split(".");
    if (parts.length !== 3) throw new Error("Invalid token");
    const header = JSON.parse(new TextDecoder().decode(decodeBase64Url(parts[0])));
    const claims = JSON.parse(new TextDecoder().decode(decodeBase64Url(parts[1])));
    if (header.alg !== "RS256" || !header.kid) throw new Error("Unsupported token");
    const issuer = `https://${team}`;
    const now = Math.floor(Date.now() / 1000);
    const audiences = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
    if (claims.iss !== issuer || !audiences.includes(audience) || !claims.exp || claims.exp <= now || (claims.nbf && claims.nbf > now)) {
      throw new Error("Invalid token claims");
    }
    const certs = await getAccessCerts(issuer);
    const cert = certs.find(item => item.kid === header.kid);
    if (!cert?.cert) throw new Error("Signing key not found");
    const key = await crypto.subtle.importKey("spki", pemToSpki(cert.cert), { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
    const valid = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, decodeBase64Url(parts[2]), new TextEncoder().encode(`${parts[0]}.${parts[1]}`));
    if (!valid) throw new Error("Invalid token signature");
    return { ok: true, claims };
  } catch (error) {
    console.error("Admin Access token validation failed");
    return { ok: false, response: new Response("Unauthorized", { status: 401 }) };
  }
}
