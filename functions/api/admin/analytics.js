import { requireAdmin } from "../_admin-auth.js";
import { ensureAnalyticsSchema, analyticsJson } from "../_analytics.js";

const labels = { human_pageview:"真人页面访问", crawler_request:"爬虫页面请求", crawler_resource_request:"爬虫资源请求", asset_request:"静态资源请求", other_request:"其他请求" };
const safeRows = rows => (rows || []).map(row => ({ ...row, event_label: labels[row.event_type] || row.event_type }));

export async function onRequestGet({ request, env }) {
  const denied = await requireAdmin(request, env);
  if (denied) return denied;
  if (!env.DB) return analyticsJson(503, { ok:false, available:false, reason:"D1 数据库绑定 DB 不可用。" });
  try {
    await ensureAnalyticsSchema(env);
    const [totals, trend, sources, bots, pages, countries, languages, statuses, recent, inquiries] = await Promise.all([
      env.DB.prepare(`SELECT
        SUM(CASE WHEN event_at >= datetime('now','-7 days') THEN 1 ELSE 0 END) AS current_requests,
        SUM(CASE WHEN event_at >= datetime('now','-14 days') AND event_at < datetime('now','-7 days') THEN 1 ELSE 0 END) AS previous_requests,
        SUM(CASE WHEN event_type='human_pageview' AND event_at >= datetime('now','-7 days') THEN 1 ELSE 0 END) AS current_pageviews,
        SUM(CASE WHEN event_type='human_pageview' AND event_at >= datetime('now','-14 days') AND event_at < datetime('now','-7 days') THEN 1 ELSE 0 END) AS previous_pageviews,
        COUNT(DISTINCT CASE WHEN event_type='human_pageview' AND event_at >= datetime('now','-7 days') THEN visitor_hash END) AS unique_visitors,
        SUM(CASE WHEN event_type IN ('crawler_request','crawler_resource_request') AND identity_verified=1 AND event_at >= datetime('now','-7 days') THEN 1 ELSE 0 END) AS verified_crawler_requests,
        SUM(CASE WHEN event_type IN ('crawler_request','crawler_resource_request') AND identity_verified=0 AND event_at >= datetime('now','-7 days') THEN 1 ELSE 0 END) AS unverified_claim_requests,
        SUM(CASE WHEN status >= 400 AND event_at >= datetime('now','-7 days') THEN 1 ELSE 0 END) AS errors,
        SUM(CASE WHEN event_at >= datetime('now','-7 days') THEN 1 ELSE 0 END) AS measured_requests
        FROM site_analytics_events`).first(),
      env.DB.prepare(`SELECT date(event_at) AS day,
        SUM(CASE WHEN event_type='human_pageview' THEN 1 ELSE 0 END) AS pageviews,
        SUM(CASE WHEN event_type IN ('crawler_request','crawler_resource_request') AND identity_verified=1 THEN 1 ELSE 0 END) AS verified_crawls,
        SUM(CASE WHEN event_type IN ('crawler_request','crawler_resource_request') AND identity_verified=0 THEN 1 ELSE 0 END) AS unverified_claims,
        COUNT(*) AS requests FROM site_analytics_events WHERE event_at >= datetime('now','-7 days') GROUP BY date(event_at) ORDER BY day`).all(),
      env.DB.prepare(`SELECT source_category AS category, COUNT(*) AS total FROM site_analytics_events WHERE event_type='human_pageview' AND event_at >= datetime('now','-7 days') GROUP BY source_category ORDER BY total DESC`).all(),
      env.DB.prepare(`SELECT actor_label, actor_category, identity_verified, COUNT(*) AS total FROM site_analytics_events WHERE event_type IN ('crawler_request','crawler_resource_request') AND event_at >= datetime('now','-7 days') GROUP BY actor_label, actor_category, identity_verified ORDER BY total DESC LIMIT 30`).all(),
      env.DB.prepare(`SELECT path, COUNT(*) AS total FROM site_analytics_events WHERE event_type='human_pageview' AND event_at >= datetime('now','-7 days') GROUP BY path ORDER BY total DESC LIMIT 10`).all(),
      env.DB.prepare(`SELECT country, COUNT(*) AS total FROM site_analytics_events WHERE event_type='human_pageview' AND event_at >= datetime('now','-7 days') AND country IS NOT NULL GROUP BY country ORDER BY total DESC LIMIT 15`).all(),
      env.DB.prepare(`SELECT language, COUNT(*) AS total FROM site_analytics_events WHERE event_type='human_pageview' AND event_at >= datetime('now','-7 days') AND language IS NOT NULL GROUP BY language ORDER BY total DESC`).all(),
      env.DB.prepare(`SELECT status, COUNT(*) AS total FROM site_analytics_events WHERE event_at >= datetime('now','-7 days') GROUP BY status ORDER BY total DESC`).all(),
      env.DB.prepare(`SELECT event_at, path, status, country, event_type, actor_label, actor_category, identity_verified FROM site_analytics_events ORDER BY id DESC LIMIT 30`).all(),
      env.DB.prepare(`SELECT
        SUM(CASE WHEN created_at >= datetime('now','-7 days') THEN 1 ELSE 0 END) AS current_inquiries,
        SUM(CASE WHEN created_at >= datetime('now','-14 days') AND created_at < datetime('now','-7 days') THEN 1 ELSE 0 END) AS previous_inquiries
        FROM inquiries`).first().catch(() => null)
    ]);
    const t = totals || {};
    const measured = Number(t.measured_requests || 0), errors = Number(t.errors || 0);
    return analyticsJson(200, {
      ok:true, available:true, window:"最近 7 天（UTC 数据库时间）", comparison:"此前 7 天",
      coverage:"仅统计网站公开请求；后台及管理员 API 已排除。真人页面访问按 HTML 页面请求统计；静态资源和其他请求单独计入请求量。机器人 User-Agent 自称未通过 Cloudflare verifiedBot 验证时，只列为未验证声明，不视为已确认爬虫。",
      totals:{ current_requests:Number(t.current_requests||0), previous_requests:Number(t.previous_requests||0), current_pageviews:Number(t.current_pageviews||0), previous_pageviews:Number(t.previous_pageviews||0), unique_visitors:t.unique_visitors===null?null:Number(t.unique_visitors||0), visitor_hash_configured:Boolean(env.ANALYTICS_HASH_SECRET), verified_crawler_requests:Number(t.verified_crawler_requests||0), unverified_claim_requests:Number(t.unverified_claim_requests||0), errors, measured_requests:measured, error_rate:measured?errors/measured:null },
      trend:trend.results||[], sources:sources.results||[], bots:bots.results||[], pages:pages.results||[], countries:countries.results||[], languages:languages.results||[], statuses:statuses.results||[], recent:safeRows(recent.results),
      inquiries:inquiries?{current:Number(inquiries.current_inquiries||0),previous:Number(inquiries.previous_inquiries||0),conversion_rate:null,note:"询盘数来自 D1 inquiries 表；当前没有会话级归因，故不计算转化率。"}:null
    });
  } catch (error) {
    console.error("Admin analytics query failed");
    return analyticsJson(503, { ok:false, available:false, reason:"分析数据表或询盘数据表不可用。请确认 D1 绑定及网站部署状态后重试。" });
  }
}
