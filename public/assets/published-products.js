(() => {
  const lang = location.pathname.split("/")[1] || "en";
  const languageKey = ({en:"english",ja:"japanese",ko:"korean",es:"spanish",pt:"portuguese",de:"german",ru:"russian",ar:"arabic","zh-cn":"chinese","zh-tw":"english"})[lang] || "english";
  const labels = {
    en:["New product","View details"],ja:["新製品","詳細を見る"],ko:["신제품","자세히 보기"],
    es:["Nuevo producto","Ver detalles"],pt:["Novo produto","Ver detalhes"],de:["Neues Produkt","Details ansehen"],
    ru:["Новый продукт","Подробнее"],ar:["منتج جديد","عرض التفاصيل"],
    "zh-cn":["新产品","查看详情"],"zh-tw":["新產品","查看詳情"]
  }[lang] || ["New product","View details"];
  const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const imageUrl = value => /^https:\/\//i.test(value || "") || /^\/assets\/[a-z0-9/_\-.]+$/i.test(value || "");
  const grid = document.querySelector(".series-grid");
  if (!grid) return;
  fetch("/api/products", {headers:{Accept:"application/json"},cache:"no-store"})
    .then(response => response.ok ? response.json() : Promise.reject(new Error("Product list unavailable")))
    .then(data => {
      if (!data.ok || !Array.isArray(data.products)) return;
      const existing = new Set(Array.from(grid.querySelectorAll("a[href]")).map(a => a.getAttribute("href")));
      data.products.forEach(product => {
        const href = "/" + lang + "/products/" + encodeURIComponent(product.slug) + "/";
        if (existing.has(href) || !imageUrl(product.image_url)) return;
        const translated = product.translations?.[languageKey] || {};
        const title = translated.title || product.title_en;
        const summary = translated.summary || product.summary_en || translated.description || product.description_en || "";
        const card = document.createElement("article");
        card.className = "series-card";
        card.innerHTML = '<div class="series-art"><span class="image-watermark"><img class="series-photo" src="' + esc(product.image_url) + '" alt="' + esc(title) + '" loading="lazy"></span></div><div class="series-copy"><p class="eyebrow">' + esc(labels[0]) + '</p><h3>' + esc(title) + '</h3><p>' + esc(summary) + '</p><a href="' + href + '">' + esc(labels[1]) + ' ↗</a></div>';
        grid.appendChild(card);
        existing.add(href);
      });
    }).catch(() => {});
})();