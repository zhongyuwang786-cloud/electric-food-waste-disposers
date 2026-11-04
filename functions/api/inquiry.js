const JSON_HEADERS = { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" };
const json = (status, body) => new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
const clean = (value, max) => String(value ?? "").trim().slice(0, max);
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;", "'":"&#39;"}[c]));

export async function onRequestPost({ request, env }) {
  if (!env.DB) return json(503, { ok: false, error: "Inquiry database is not configured" });
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) return json(415, { ok: false, error: "Expected application/json" });
  // Enforce same-origin browser submissions when SITE_ORIGIN is configured.
  const origin = request.headers.get("Origin");
  if (env.SITE_ORIGIN && origin && origin !== env.SITE_ORIGIN) return json(403, { ok: false, error: "Origin not allowed" });
  // Limit payload size before parsing to reduce oversized-body abuse.
  const declaredLength = Number(request.headers.get("Content-Length") || 0);
  if (declaredLength > 16_384) return json(413, { ok: false, error: "Request body is too large" });
  let raw;
  try { raw = await request.text(); } catch { return json(400, { ok: false, error: "Invalid request body" }); }
  if (new TextEncoder().encode(raw).byteLength > 16_384) return json(413, { ok: false, error: "Request body is too large" });
  let d;
  try { d = JSON.parse(raw); } catch { return json(400, { ok: false, error: "Invalid JSON" }); }
  if (!d || typeof d !== "object" || Array.isArray(d)) return json(400, { ok: false, error: "Invalid inquiry data" });
  // Honeypot field: bots often fill hidden fields. Silently reject without storing.
  if (clean(d.website, 200)) return json(200, { ok: true });
  const name = clean(d.name, 120);
  const company = clean(d.company, 180);
  const email = clean(d.email, 254);
  const market = clean(d.market, 100);
  const message = clean(d.message, 5000);
  const requestedLanguage = clean(d.language || "en", 10).toLowerCase();
  const supportedLanguages = new Set(["en", "ja", "ko", "es", "pt", "de", "ru", "ar", "zh-cn", "zh-tw"]);
  const language = supportedLanguages.has(requestedLanguage) ? requestedLanguage : "en";
  const supportedMarkets = new Set(["", "north-america", "europe", "japan-korea", "south-america", "middle-east", "other"]);
  if (!supportedMarkets.has(market)) return json(400, { ok: false, error: "Please select a valid target market" });
  if (!name || !company || !message || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json(400, { ok: false, error: "Please provide valid name, company, business email and project requirements" });
  }
  let inquiryId;
  try {
    const saved = await env.DB.prepare("INSERT INTO inquiries (name, company, email, market, message, language) VALUES (?, ?, ?, ?, ?, ?)")
      .bind(name, company, email, market, message, language).run();
    inquiryId = saved.meta?.last_row_id ?? null;
  } catch (e) {
    return json(500, { ok: false, error: "Could not save inquiry" });
  }

  // Send a notification via Resend's REST API. Store the lead first, so a mail outage
  // does not discard the inquiry. Set all three variables/secrets in Cloudflare Pages.
  if (!env.RESEND_API_KEY || !env.INQUIRY_TO_EMAIL || !env.INQUIRY_FROM_EMAIL) {
    return json(201, { ok: true, saved: true, notification: "not_configured", id: inquiryId });
  }
  const textBody = [
    "New B2B website inquiry", `Inquiry ID: ${inquiryId ?? "unknown"}`, "",
    `Name: ${name}`, `Company: ${company}`, `Email: ${email}`,
    `Target market: ${market}`, `Language: ${language}`, "", "Requirements:", message
  ].join("\n");
  const htmlBody = `<h2>New B2B website inquiry</h2><p><b>Inquiry ID:</b> ${escapeHtml(inquiryId ?? "unknown")}</p><p><b>Name:</b> ${escapeHtml(name)}<br><b>Company:</b> ${escapeHtml(company)}<br><b>Email:</b> ${escapeHtml(email)}<br><b>Target market:</b> ${escapeHtml(market)}<br><b>Language:</b> ${escapeHtml(language)}</p><h3>Requirements</h3><p>${escapeHtml(message).replace(/\n/g, "<br>")}</p>`;
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: env.INQUIRY_FROM_EMAIL,
        to: [env.INQUIRY_TO_EMAIL],
        reply_to: email,
        subject: `Website B2B inquiry${company ? ` — ${company.replace(/[\\r\\n]+/g, " ")}` : ""}`,
        text: textBody,
        html: htmlBody
      })
    });
    if (!response.ok) {
      // Lead is already saved; don't expose provider error details to public visitors.
      console.error("Inquiry notification provider returned status", response.status);
      return json(201, { ok: true, saved: true, notification: "failed", id: inquiryId });
    }
    return json(201, { ok: true, saved: true, notification: "sent", id: inquiryId });
  } catch (e) {
    console.error("Inquiry notification request failed");
    return json(201, { ok: true, saved: true, notification: "failed", id: inquiryId });
  }
}
