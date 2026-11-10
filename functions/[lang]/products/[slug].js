const LANGUAGES = {
  en: { key: "english", label: "English", code: "en" },
  ja: { key: "japanese", label: "日本語", code: "ja" },
  ko: { key: "korean", label: "한국어", code: "ko" },
  es: { key: "spanish", label: "Español", code: "es" },
  pt: { key: "portuguese", label: "Português", code: "pt" },
  de: { key: "german", label: "Deutsch", code: "de" },
  ru: { key: "russian", label: "Русский", code: "ru" },
  ar: { key: "arabic", label: "العربية", code: "ar" },
  "zh-cn": { key: "chinese", label: "简体中文", code: "zh-CN" },
  "zh-tw": { key: "english", label: "繁體中文", code: "zh-TW" }
};
const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
const paragraphHtml = value => String(value || "").split(/\n{2,}/).map(part => "<p>" + escapeHtml(part).replace(/\n/g, "<br>") + "</p>").join("");
const response = (body, status = 200) => new Response(body, { status, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=60, s-maxage=60" } });

export async function onRequestGet({ params, env }) {
  const lang = String(params.lang || "en").toLowerCase();
  const locale = LANGUAGES[lang];
  if (!locale) return response("<!doctype html><title>Not found</title><h1>Not found</h1>", 404);
  if (!env.DB) return response("<!doctype html><title>Temporarily unavailable</title><h1>Temporarily unavailable</h1>", 503);
  const slug = String(params.slug || "");
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return response("<!doctype html><title>Not found</title><h1>Not found</h1>", 404);
  let row;
  try {
    row = await env.DB.prepare("SELECT * FROM products WHERE slug = ? AND published_at IS NOT NULL LIMIT 1").bind(slug).first();
  } catch (error) {
    console.error("Published product page lookup failed");
    return response("<!doctype html><title>Temporarily unavailable</title><h1>Temporarily unavailable</h1>", 503);
  }
  if (!row) return response("<!doctype html><title>Product not found</title><h1>Product not found</h1>", 404);
  let translations = {};
  try { translations = JSON.parse(row.translations_json || "{}"); } catch {}
  const translated = translations[locale.key] || {};
  const fallback = lang === "zh-tw";
  const title = String(translated.title || row.title_en || "");
  const summary = String(translated.summary || row.summary_en || "");
  const description = String(translated.description || row.description_en || "");
  const seoTitle = String(translated.seo_title || row.seo_title_en || title);
  const seoDescription = String(translated.seo_description || row.seo_description_en || summary || description).slice(0, 320);
  const image = String(row.image_url || "");
  const canonical = "https://electricfoodwaste.com/" + lang + "/products/" + slug + "/";
  const alternateLinks = Object.keys(LANGUAGES).map(code => '<link rel="alternate" hreflang="' + LANGUAGES[code].code + '" href="https://electricfoodwaste.com/' + code + '/products/' + slug + '/">').join("");
  const jsonLd = JSON.stringify({ "@context":"https://schema.org", "@type":"Product", name:title, description:summary || description, image:image.startsWith("http") ? image : "https://electricfoodwaste.com" + image, brand:{ "@type":"Brand", name:"Electric Food Waste Disposers" }, manufacturer:{ "@type":"Organization", name:"Electric Food Waste Disposers", url:"https://electricfoodwaste.com/" }, url:canonical }).replace(/</g, "\\u003c");
  const rtl = lang === "ar" ? ' dir="rtl"' : "";
  const contact = "/" + lang + "/#contact";
  const body = `<!doctype html>
<html lang="${locale.code}"${rtl}><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(seoTitle)}</title><meta name="description" content="${escapeHtml(seoDescription)}"><meta name="robots" content="index,follow"><link rel="canonical" href="${canonical}">
<link rel="stylesheet" href="/styles.css"><meta property="og:type" content="product"><meta property="og:site_name" content="Electric Food Waste Disposers"><meta property="og:title" content="${escapeHtml(seoTitle)}"><meta property="og:description" content="${escapeHtml(seoDescription)}"><meta property="og:url" content="${canonical}"><meta property="og:image" content="${escapeHtml(image.startsWith("http") ? image : "https://electricfoodwaste.com" + image)}"><meta name="twitter:card" content="summary_large_image">${alternateLinks}<script type="application/ld+json">${jsonLd}</script>
<style>.published-product{padding:58px 8%;display:grid;grid-template-columns:1fr 1fr;gap:6%;align-items:center;background:#edf1e9}.published-product h1{font-size:clamp(2rem,4vw,3.5rem);line-height:1.1;margin:0 0 18px}.published-product p{color:#58665f;line-height:1.8}.published-image{background:#fff;border-radius:14px;min-height:360px;display:grid;place-items:center;overflow:hidden}.published-image img{width:100%;height:100%;max-height:560px;object-fit:contain}.published-copy{padding:56px 8%;line-height:1.8}.published-copy h2{font-size:clamp(1.6rem,3vw,2.4rem)}.published-cta{padding:55px 8%;background:#193b33;color:white;text-align:center}.published-cta p{color:#d2ddd7}.published-cta a{display:inline-flex}@media(max-width:760px){.published-product{grid-template-columns:1fr;padding:38px 6%}.published-image{min-height:260px}.published-copy{padding:40px 6%}}</style></head>
<body><header class="topbar"><a class="brand" href="/${lang}/"><span class="brand-mark">D</span><span>Electric Food Waste Disposers</span></a><nav class="desktop-nav"><a href="/${lang}/products/">${escapeHtml(locale.label)}</a><a href="/${lang}/oem-odm/">OEM / ODM</a><a href="/${lang}/factory/">Factory</a></nav><div class="header-actions"><a class="button button-small" href="${contact}">Contact us</a></div></header>
<main><div class="crumbs"><a href="/${lang}/">Electric Food Waste Disposers</a> / <a href="/${lang}/products/">Products</a> / ${escapeHtml(title)}</div>
<section class="published-product"><div><p class="eyebrow">PRODUCTS</p><h1>${escapeHtml(title)}</h1>${paragraphHtml(summary)}<p><strong>Process:</strong> Heating and drying with volume reduction</p><a class="button" href="${contact}">Contact the manufacturer</a></div><div class="published-image"><img src="${escapeHtml(image)}" alt="${escapeHtml(title)}" loading="eager"></div></section>
<section class="published-copy"><h2>Product overview</h2>${paragraphHtml(description)}<h2>OEM / ODM customization</h2><p>OEM private-label production and ODM product customization are available for qualified projects. Discuss custom logos, packaging and manuals, appearance and color, voltage and plug requirements, and sample orders. Minimum order quantity: 500+ units. Lead time is confirmed according to each order.</p><p>Product configuration and technical specifications are confirmed during customer inquiry. No unverified technical values are published.</p></section>
<section class="published-cta"><h2>Discuss this product for your market</h2><p>Share your target market, estimated quantity and customization requirements.</p><a class="button" href="${contact}">Request product information</a></section></main>
<footer style="padding:28px 8%;background:#fff;color:#66736f;font-size:.82rem">Electric Food Waste Disposers · <a href="/${lang}/products/">Products</a> · <a href="/${lang}/">Home</a></footer>
<a class="whatsapp-float" href="https://wa.me/8615820479535?text=Hello%2C%20I%20am%20interested%20in%20your%20food%20waste%20processor." target="_blank" rel="noopener noreferrer" aria-label="Chat with us on WhatsApp"><span>WhatsApp</span></a><script src="/site-ui.js" defer></script></body></html>`;
  return response(body);
}
