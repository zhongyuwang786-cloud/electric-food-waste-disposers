export async function onRequestGet({ params, env }) {
  const filename = String(params.filename || "");
  if (!/^[a-f0-9-]{36}\.(?:jpg|png|webp)$/i.test(filename)) {
    return new Response("Not found", { status: 404 });
  }
  if (!env.PRODUCT_IMAGES) return new Response("Image storage unavailable", { status: 503 });
  const object = await env.PRODUCT_IMAGES.get("product-images/" + filename);
  if (!object) return new Response("Not found", { status: 404 });
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("Cache-Control", "public, max-age=31536000, immutable");
  headers.set("X-Content-Type-Options", "nosniff");
  return new Response(object.body, { headers });
}
