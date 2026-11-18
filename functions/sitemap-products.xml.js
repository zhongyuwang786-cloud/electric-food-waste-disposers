import { STATIC_PRODUCT_SLUGS } from "./_static-product-slugs.js";
import { getAvailableProductLocales, PRODUCT_LOCALES } from "./_product-locales.js";


export async function onRequestGet({ env }) {
  const headers = { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=300, s-maxage=300" };
  if (!env.DB) return new Response("<?xml version=\"1.0\"?><urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\"/>", { status: 503, headers });
  try {
    const result = await env.DB.prepare("SELECT slug, title_en, description_en, translations_json, published_at FROM products WHERE published_at IS NOT NULL ORDER BY published_at DESC").all();
    const urls = [];
    for (const product of result.results || []) {
      if (STATIC_PRODUCT_SLUGS.has(product.slug)) continue;
      let translations = {};
      try { translations = JSON.parse(product.translations_json || "{}"); } catch {}
      const availableLocales = getAvailableProductLocales(product, translations);
      for (const lang of availableLocales) {
        const loc = "https://electricfoodwaste.com/" + lang + "/products/" + encodeURIComponent(product.slug) + "/";
        const alternates = availableLocales.map(code => {
          const locale = PRODUCT_LOCALES.find(item => item.path === code);
          return '<xhtml:link rel="alternate" hreflang="' + locale.hreflang + '" href="https://electricfoodwaste.com/' + code + '/products/' + encodeURIComponent(product.slug) + '/"/>';
        }).join("") + '<xhtml:link rel="alternate" hreflang="x-default" href="https://electricfoodwaste.com/en/products/' + encodeURIComponent(product.slug) + '/"/>';
        urls.push("<url><loc>" + loc + "</loc>" + alternates + (product.published_at ? "<lastmod>" + new Date(product.published_at.replace(" ", "T") + "Z").toISOString().slice(0,10) + "</lastmod>" : "") + "</url>");
      }
    }
    const xml = '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">' + urls.join("") + "</urlset>";
    return new Response(xml, { status: 200, headers });
  } catch (error) {
    console.error("Published product sitemap failed");
    return new Response("<?xml version=\"1.0\"?><urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\"/>", { status: 503, headers });
  }
}
