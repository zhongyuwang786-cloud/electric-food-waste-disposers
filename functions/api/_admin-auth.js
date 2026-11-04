const decode = (value) => {
  const text = value.replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(text.padEnd(Math.ceil(text.length / 4) * 4, "="));
  return Uint8Array.from(raw, c => c.charCodeAt(0));
};
const readTlv = (data, offset) => {
  let length = data[offset + 1], header = 2;
  if (length & 128) {
    const count = length & 127;
    length = 0;
    for (let i = 0; i < count; i++) length = length * 256 + data[offset + 2 + i];
    header += count;
  }
  return { tag: data[offset], start: offset, content: offset + header, end: offset + header + length };
};
function certificateKey(pem) {
  const raw = atob(pem.replace(/-----[^-]+-----/g, "").replace(/\s/g, ""));
  const der = Uint8Array.from(raw, c => c.charCodeAt(0));
  const cert = readTlv(der, 0), tbs = readTlv(der, cert.content);
  const fields = [];
  for (let p = tbs.content; p < tbs.end;) { const field = readTlv(der, p); fields.push(field); p = field.end; }
  const key = fields[fields[0]?.tag === 160 ? 6 : 5];
  if (!key || key.tag !== 48) throw new Error("Invalid certificate");
  return der.slice(key.start, key.end);
}
let cachedKeys = null, cachedAt = 0;
async function getKeys(issuer) {
  if (cachedKeys && Date.now() - cachedAt < 300000) return cachedKeys;
  const response = await fetch(issuer + "/cdn-cgi/access/certs");
  if (!response.ok) throw new Error("Could not load Access certificates");
  cachedKeys = (await response.json()).public_certs || [];
  cachedAt = Date.now();
  return cachedKeys;
}
export async function requireAdmin(request, env) {
  const team = String(env.ACCESS_TEAM_DOMAIN || "").replace(/^https?:\/\//, "").replace(/\/$/, "");
  const audience = String(env.ACCESS_AUD || "");
  if (!team || !audience) return new Response("Admin access is not configured", { status: 503 });
  const token = request.headers.get("Cf-Access-Jwt-Assertion");
  if (!token) return new Response("Unauthorized", { status: 401 });
  try {
    const parts = token.split(".");
    if (parts.length !== 3) throw new Error("Invalid token");
    const header = JSON.parse(new TextDecoder().decode(decode(parts[0])));
    const claims = JSON.parse(new TextDecoder().decode(decode(parts[1])));
    const issuer = "https://" + team;
    const now = Math.floor(Date.now() / 1000);
    const audiences = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
    if (header.alg !== "RS256" || claims.iss !== issuer || !audiences.includes(audience) || !claims.exp || claims.exp <= now || (claims.nbf && claims.nbf > now)) throw new Error("Invalid claims");
    const cert = (await getKeys(issuer)).find(item => item.kid === header.kid);
    if (!cert?.cert) throw new Error("Unknown signing key");
    const key = await crypto.subtle.importKey("spki", certificateKey(cert.cert), { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
    const valid = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, decode(parts[2]), new TextEncoder().encode(parts[0] + "." + parts[1]));
    if (!valid) throw new Error("Invalid signature");
    return null;
  } catch (error) {
    console.error("Access JWT verification failed");
    return new Response("Unauthorized", { status: 401 });
  }
}
