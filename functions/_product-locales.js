const TRANSLATED_LOCALES = [
  { path: "ja", key: "japanese", hreflang: "ja" },
  { path: "ko", key: "korean", hreflang: "ko" },
  { path: "es", key: "spanish", hreflang: "es" },
  { path: "pt", key: "portuguese", hreflang: "pt" },
  { path: "de", key: "german", hreflang: "de" },
  { path: "ru", key: "russian", hreflang: "ru" },
  { path: "ar", key: "arabic", hreflang: "ar" },
  { path: "zh-cn", key: "chinese", hreflang: "zh-CN" }
];

export const PRODUCT_LOCALES = [
  { path: "en", key: "english", hreflang: "en" },
  ...TRANSLATED_LOCALES,
  { path: "zh-tw", key: "english", hreflang: "zh-TW" }
];

const hasText = value => typeof value === "string" && value.trim().length > 0;

export function getAvailableProductLocales(product, translations = {}) {
  if (!hasText(product?.title_en) || !hasText(product?.description_en)) return [];
  const available = ["en"];
  for (const locale of TRANSLATED_LOCALES) {
    const item = translations?.[locale.key];
    if (
      item &&
      hasText(item.title) &&
      hasText(item.description) &&
      hasText(item.seo_title) &&
      hasText(item.seo_description)
    ) available.push(locale.path);
  }
  available.push("zh-tw");
  return available;
}
