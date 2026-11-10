import { requireAdmin } from "../_admin-auth.js";

const headers = { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" };
const json = (status, body) => new Response(JSON.stringify(body), { status, headers });
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const text = (value, max) => typeof value === "string" ? value.trim().slice(0, max) : "";

async function authorize(request, env) {
  return requireAdmin(request, env);
}

function serialize(row) {
  let translations = {};
  try { translations = JSON.parse(row.translations_json || "{}"); } catch {}
  return { ...row, translations };
}

export async function onRequestGet({ request, env }) {
  const denied = await authorize(request, env);
  if (denied) return denied;
  if (!env.DB) return json(503, { ok: false, error: "Product database is not configured" });
  const url = new URL(request.url);
  const status = url.searchParams.get("status") || "";
  if (status && !["draft", "archived"].includes(status)) return json(400, { ok: false, error: "Invalid status" });
  try {
    const query = status
      ? env.DB.prepare("SELECT * FROM products WHERE status = ? ORDER BY updated_at DESC, id DESC").bind(status)
      : env.DB.prepare("SELECT * FROM products ORDER BY updated_at DESC, id DESC");
    const result = await query.all();
    return json(200, { ok: true, products: (result.results || []).map(serialize) });
  } catch (error) {
    console.error("Admin product list failed");
    return json(500, { ok: false, error: "Could not load products. Confirm the products table has been created in D1." });
  }
}

export async function onRequestPost({ request, env }) {
  const denied = await authorize(request, env);
  if (denied) return denied;
  if (!env.DB) return json(503, { ok: false, error: "Product database is not configured" });
  let data;
  try { data = await request.json(); } catch { return json(400, { ok: false, error: "Invalid JSON" }); }
  const slug = text(data?.slug, 100).toLowerCase();
  const title = text(data?.title_en, 180);
  const image = text(data?.image_url, 1000);
  if (!slugPattern.test(slug)) return json(400, { ok: false, error: "Slug must use lowercase letters, numbers and hyphens." });
  if (!title) return json(400, { ok: false, error: "English product title is required." });
  if (image && !/^https:\/\//i.test(image) && !image.startsWith("/assets/")) return json(400, { ok: false, error: "Image must use an HTTPS URL or a site /assets/ path." });
  const values = [
    slug, title, text(data.summary_en, 500), text(data.description_en, 12000), image,
    text(data.seo_title_en, 180), text(data.seo_description_en, 320)
  ];
  try {
    const result = await env.DB.prepare(
      "INSERT INTO products (slug, title_en, summary_en, description_en, image_url, seo_title_en, seo_description_en) VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id"
    ).bind(...values).first();
    return json(201, { ok: true, id: result.id });
  } catch (error) {
    if (String(error?.message || "").toLowerCase().includes("unique")) return json(409, { ok: false, error: "This product slug already exists." });
    console.error("Admin product create failed");
    return json(500, { ok: false, error: "Could not save product draft." });
  }
}

export async function onRequestPatch({ request, env }) {
  const denied = await authorize(request, env);
  if (denied) return denied;
  if (!env.DB) return json(503, { ok: false, error: "Product database is not configured" });
  let data;
  try { data = await request.json(); } catch { return json(400, { ok: false, error: "Invalid JSON" }); }
  const id = Number(data?.id);
  if (!Number.isSafeInteger(id) || id < 1) return json(400, { ok: false, error: "Invalid product ID" });

  if (data?.action === "unpublish") {
    try {
      await env.DB.prepare("UPDATE products SET published_at = NULL, updated_at = datetime('now') WHERE id = ?").bind(id).run();
      return json(200, { ok: true, id, published: false });
    } catch {
      return json(500, { ok: false, error: "Could not unpublish product." });
    }
  }

  if (data?.action === "publish") {
    try {
      const row = await env.DB.prepare("SELECT * FROM products WHERE id = ?").bind(id).first();
      if (!row) return json(404, { ok: false, error: "Product not found." });
      const image = text(row.image_url, 1000);
      if (!image || (!/^https:\/\//i.test(image) && !image.startsWith("/assets/"))) {
        return json(400, { ok: false, error: "请先填写有效的产品图片 HTTPS 地址或 /assets/ 图片路径。" });
      }
      let translations = {};
      try { translations = JSON.parse(row.translations_json || "{}"); } catch {}
      const required = ["japanese","korean","spanish","portuguese","german","russian","arabic","chinese"];
      const missing = required.filter(language => {
        const item = translations[language];
        return !item || typeof item !== "object" || !String(item.title || "").trim() || !String(item.description || "").trim();
      });
      if (missing.length) return json(400, { ok: false, error: "以下语言缺少标题或详情译文，暂不能发布：" + missing.join(", ") });
      await env.DB.prepare("UPDATE products SET status = 'draft', published_at = datetime('now'), updated_at = datetime('now') WHERE id = ?").bind(id).run();
      return json(200, { ok: true, id, published: true });
    } catch (error) {
      console.error("Admin product publish failed");
      return json(500, { ok: false, error: "Could not publish product." });
    }
  }

  const fields = {
    slug: text(data.slug, 100).toLowerCase(),
    title_en: text(data.title_en, 180),
    summary_en: text(data.summary_en, 500),
    description_en: text(data.description_en, 12000),
    image_url: text(data.image_url, 1000),
    seo_title_en: text(data.seo_title_en, 180),
    seo_description_en: text(data.seo_description_en, 320)
  };
  if (!slugPattern.test(fields.slug) || !fields.title_en) return json(400, { ok: false, error: "A valid slug and English title are required." });
  if (fields.image_url && !/^https:\/\//i.test(fields.image_url) && !fields.image_url.startsWith("/assets/")) return json(400, { ok: false, error: "Image must use an HTTPS URL or a site /assets/ path." });
  const status = data.status === "archived" ? "archived" : "draft";
  let translationsJson = null;
  if (Object.prototype.hasOwnProperty.call(data, "translations")) {
    if (!data.translations || typeof data.translations !== "object" || Array.isArray(data.translations)) {
      return json(400, { ok: false, error: "Translations must be an object." });
    }
    translationsJson = JSON.stringify(data.translations);
    if (translationsJson.length > 100000) return json(413, { ok: false, error: "Translation data is too large." });
  }
  try {
    const result = await env.DB.prepare(
      "UPDATE products SET slug = ?, title_en = ?, summary_en = ?, description_en = ?, image_url = ?, seo_title_en = ?, seo_description_en = ?, status = ?, published_at = CASE WHEN ? = 'archived' THEN NULL ELSE published_at END, translations_json = COALESCE(?, translations_json), updated_at = datetime('now') WHERE id = ?"
    ).bind(fields.slug, fields.title_en, fields.summary_en, fields.description_en, fields.image_url, fields.seo_title_en, fields.seo_description_en, status, status, translationsJson, id).run();
    if (!result.meta?.changes) return json(404, { ok: false, error: "Product not found." });
    return json(200, { ok: true, id, status });
  } catch (error) {
    if (String(error?.message || "").toLowerCase().includes("unique")) return json(409, { ok: false, error: "This product slug already exists." });
    console.error("Admin product update failed");
    return json(500, { ok: false, error: "Could not update product draft." });
  }
}
