import { requireAdmin } from "../_admin-auth.js";

const headers = { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" };
const json = (status, body) => new Response(JSON.stringify(body), { status, headers });

// M2M100 uses language names/codes. Traditional Chinese is intentionally
// excluded until a script-conversion step is added and verified.
const languages = new Set([
  "english", "japanese", "korean", "spanish", "portuguese",
  "german", "russian", "arabic", "chinese"
]);

export async function onRequestPost({ request, env }) {
  const denied = await requireAdmin(request, env);
  if (denied) return denied;
  if (!env.AI) return json(503, { ok: false, error: "Workers AI binding AI is not configured" });

  let data;
  try { data = await request.json(); }
  catch { return json(400, { ok: false, error: "Invalid JSON" }); }

  const text = typeof data?.text === "string" ? data.text.trim() : "";
  const sourceLang = String(data?.source_lang || "english").toLowerCase();
  const targetLang = String(data?.target_lang || "").toLowerCase();

  if (!text) return json(400, { ok: false, error: "Text is required" });
  if (text.length > 5000) return json(413, { ok: false, error: "Text must be 5000 characters or fewer" });
  if (!languages.has(sourceLang) || !languages.has(targetLang)) {
    return json(400, { ok: false, error: "Unsupported language. Traditional Chinese is not enabled yet." });
  }
  if (sourceLang === targetLang) return json(200, { ok: true, translated_text: text });

  try {
    const result = await env.AI.run("@cf/meta/m2m100-1.2b", {
      text,
      source_lang: sourceLang,
      target_lang: targetLang
    });
    const translated = typeof result?.translated_text === "string" ? result.translated_text.trim() : "";
    if (!translated) {
      console.error("Workers AI returned no translated_text");
      return json(502, { ok: false, error: "Translation service returned an empty result" });
    }
    return json(200, { ok: true, translated_text: translated });
  } catch (error) {
    console.error("Admin translation failed");
    return json(502, { ok: false, error: "Translation service is temporarily unavailable" });
  }
}
