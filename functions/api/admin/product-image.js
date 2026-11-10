import { requireAdmin } from "./_admin-auth.js";

const json = (status, body) => new Response(JSON.stringify(body), {
  status,
  headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
});
const MAX_SIZE = 10 * 1024 * 1024;
const formats = {
  "image/jpeg": { extension: "jpg", signature: bytes => bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff },
  "image/png": { extension: "png", signature: bytes => bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 },
  "image/webp": { extension: "webp", signature: bytes => String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP" }
};

export async function onRequestPost({ request, env }) {
  const denied = await requireAdmin(request, env);
  if (denied) return denied;
  if (!env.PRODUCT_IMAGES) return json(503, { ok: false, error: "图片存储尚未连接。请在 Cloudflare Pages 添加 PRODUCT_IMAGES R2 绑定。" });

  let form;
  try { form = await request.formData(); }
  catch { return json(400, { ok: false, error: "无法读取上传文件。" }); }
  const file = form.get("image");
  if (!file || typeof file.arrayBuffer !== "function") return json(400, { ok: false, error: "请选择一张图片。" });
  if (!file.size || file.size > MAX_SIZE) return json(413, { ok: false, error: "图片必须大于 0 且不超过 10 MB。" });

  const format = formats[file.type];
  if (!format) return json(415, { ok: false, error: "只支持 JPG、PNG 或 WebP 图片。" });
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!format.signature(bytes)) return json(415, { ok: false, error: "图片文件内容与格式不匹配。" });

  const filename = crypto.randomUUID() + "." + format.extension;
  const key = "product-images/" + filename;
  try {
    await env.PRODUCT_IMAGES.put(key, bytes, {
      httpMetadata: { contentType: file.type, cacheControl: "public, max-age=31536000, immutable" },
      customMetadata: { originalName: String(file.name || "").slice(0, 120) }
    });
    return json(201, { ok: true, image_url: "/media/" + filename });
  } catch {
    console.error("Product image upload failed");
    return json(500, { ok: false, error: "图片存储失败，请稍后重试。" });
  }
}
