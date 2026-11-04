import { requireAdmin } from "../_admin-auth.js";

const headers = { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" };
const json = (status, body) => new Response(JSON.stringify(body), { status, headers });
const allowedStatuses = new Set(["new", "contacted", "qualified", "closed", "spam"]);
const columns = ["id", "created_at", "name", "company", "email", "market", "message", "language", "status"];
const csvCell = (value) => {
  let text = String(value ?? "").replace(/[\r\n]+/g, " ");
  if (/^[=+\-@\t]/.test(text)) text = "'" + text;
  return '"' + text.replace(/"/g, '""') + '"';
};

async function authorize(request, env) {
  return requireAdmin(request, env);
}

export async function onRequestGet({ request, env }) {
  const denied = await authorize(request, env);
  if (denied) return denied;
  if (!env.DB) return json(503, { ok: false, error: "Inquiry database is not configured" });
  const url = new URL(request.url);
  const page = Math.max(1, Number.parseInt(url.searchParams.get("page") || "1", 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(url.searchParams.get("limit") || "25", 10) || 25));
  const status = url.searchParams.get("status") || "";
  const query = (url.searchParams.get("q") || "").trim().slice(0, 100);
  if (status && !allowedStatuses.has(status)) return json(400, { ok: false, error: "Invalid status" });
  const filters = [], values = [];
  if (status) { filters.push("status = ?"); values.push(status); }
  if (query) {
    filters.push("(name LIKE ? OR company LIKE ? OR email LIKE ?)");
    values.push("%" + query + "%", "%" + query + "%", "%" + query + "%");
  }
  const where = filters.length ? " WHERE " + filters.join(" AND ") : "";
  try {
    if (url.searchParams.get("format") === "csv") {
      const result = await env.DB.prepare("SELECT " + columns.join(", ") + " FROM inquiries" + where + " ORDER BY id DESC LIMIT 5000").bind(...values).all();
      const csv = [columns.join(","), ...(result.results || []).map(row => columns.map(key => csvCell(row[key])).join(","))].join("\r\n");
      return new Response("\uFEFF" + csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="inquiries.csv"', "Cache-Control": "no-store" } });
    }
    const count = await env.DB.prepare("SELECT COUNT(*) AS total FROM inquiries" + where).bind(...values).first();
    const result = await env.DB.prepare("SELECT " + columns.join(", ") + " FROM inquiries" + where + " ORDER BY id DESC LIMIT ? OFFSET ?").bind(...values, limit, (page - 1) * limit).all();
    return json(200, { ok: true, total: count?.total || 0, page, limit, inquiries: result.results || [] });
  } catch (error) {
    console.error("Admin inquiry list failed");
    return json(500, { ok: false, error: "Could not load inquiries" });
  }
}

export async function onRequestPatch({ request, env }) {
  const denied = await authorize(request, env);
  if (denied) return denied;
  if (!env.DB) return json(503, { ok: false, error: "Inquiry database is not configured" });
  let data;
  try { data = await request.json(); } catch { return json(400, { ok: false, error: "Invalid JSON" }); }
  const id = Number(data?.id), status = String(data?.status || "");
  if (!Number.isSafeInteger(id) || id < 1 || !allowedStatuses.has(status)) return json(400, { ok: false, error: "Invalid inquiry ID or status" });
  try {
    const result = await env.DB.prepare("UPDATE inquiries SET status = ? WHERE id = ?").bind(status, id).run();
    if (!result.meta?.changes) return json(404, { ok: false, error: "Inquiry not found" });
    return json(200, { ok: true, id, status });
  } catch (error) {
    console.error("Admin inquiry update failed");
    return json(500, { ok: false, error: "Could not update inquiry" });
  }
}
