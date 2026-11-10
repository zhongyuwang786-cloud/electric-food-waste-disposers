const headers = { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "public, max-age=60, s-maxage=60" };

export async function onRequestGet({ env }) {
  if (!env.DB) return new Response(JSON.stringify({ ok: false, error: "Product database is not configured" }), { status: 503, headers });
  try {
    const result = await env.DB.prepare("SELECT id, slug, title_en, summary_en, description_en, image_url, seo_title_en, seo_description_en, translations_json, published_at FROM products WHERE published_at IS NOT NULL ORDER BY published_at DESC, id DESC").all();
    const products = (result.results || []).map(row => {
      let translations = {};
      try { translations = JSON.parse(row.translations_json || "{}"); } catch {}
      return { id: row.id, slug: row.slug, title_en: row.title_en, summary_en: row.summary_en, description_en: row.description_en, image_url: row.image_url, seo_title_en: row.seo_title_en, seo_description_en: row.seo_description_en, translations, published_at: row.published_at };
    });
    return new Response(JSON.stringify({ ok: true, products }), { status: 200, headers });
  } catch (error) {
    console.error("Public product listing failed");
    return new Response(JSON.stringify({ ok: false, error: "Could not load published products" }), { status: 500, headers });
  }
}
