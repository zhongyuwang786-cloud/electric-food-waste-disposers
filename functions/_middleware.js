import { ensureAnalyticsSchema } from "./api/_analytics.js";

const aiBots = [
  ["GPTBot", /GPTBot/i], ["OAI-SearchBot", /OAI-SearchBot/i], ["ChatGPT-User", /ChatGPT-User/i],
  ["ClaudeBot", /ClaudeBot/i], ["Claude-SearchBot", /Claude-SearchBot/i], ["Claude-User", /Claude-User/i],
  ["PerplexityBot", /PerplexityBot/i], ["Perplexity-User", /Perplexity-User/i],
  ["Google-Extended", /Google-Extended/i], ["Applebot", /Applebot/i], ["Meta-ExternalAgent", /Meta-ExternalAgent/i],
  ["Amazonbot", /Amazonbot/i], ["CCBot", /CCBot/i], ["Bytespider", /Bytespider/i],
  ["DeepSeek", /DeepSeekBot|DeepSeek/i], ["Kimi", /KimiBot|Moonshot/i], ["Doubao", /Bytespider|DoubaoBot/i],
  ["Tencent Yuanbao", /YuanbaoBot|TencentBot/i], ["ERNIE", /ERNIE|WenxinBot/i]
];
const searchBots = [
  ["Googlebot", /Googlebot/i], ["Bingbot", /bingbot/i], ["Baiduspider", /Baiduspider/i],
  ["YandexBot", /YandexBot/i], ["NaverBot", /Yeti|NaverBot/i], ["Daum", /Daumoa/i],
  ["Sogou", /Sogou/i], ["360Spider", /360Spider/i], ["Shenma", /YisouSpider/i],
  ["SeznamBot", /SeznamBot/i], ["DuckDuckBot", /DuckDuckBot/i], ["Qwantify", /Qwantify/i],
  ["Ecosia", /Ecosia/i], ["Brave", /Bravebot/i], ["Yahoo", /Slurp/i]
];
const social = ["facebook.com","l.facebook.com","instagram.com","l.instagram.com","youtube.com","youtu.be","tiktok.com","linkedin.com","pinterest.com","t.co","x.com","twitter.com"];
const search = ["google.","bing.com","baidu.com","yandex.","naver.com","daum.net","sogou.com","so.com","sm.cn","seznam.cz","duckduckgo.com","qwant.com","ecosia.org","search.brave.com","search.yahoo.com"];
const aiReferrers = ["chatgpt.com","chat.openai.com","perplexity.ai","claude.ai","gemini.google.com","copilot.microsoft.com","you.com","phind.com","komo.ai"];
const locales = new Set(["en","zh-cn","zh-tw","ja","ko","es","pt","de","ru","ar"]);
function host(value) { try { return value ? new URL(value).hostname.toLowerCase().replace(/^www\./,"") : ""; } catch { return ""; } }
function sourceFor(url, refHost) {
  const utm = (url.searchParams.get("utm_source") || "").toLowerCase();
  const evidence = utm || refHost;
  if (!evidence) return "direct";
  if (social.some(x => evidence.includes(x))) return "social_media";
  if (aiReferrers.some(x => evidence.includes(x))) return "ai_recommendation";
  if (search.some(x => evidence.includes(x))) return "search_engine";
  return "other";
}
async function visitorHash(request, env) {
  const secret = String(env.ANALYTICS_HASH_SECRET || "");
  const ip = request.headers.get("CF-Connecting-IP");
  if (!secret || !ip) return null;
  const bytes = new TextEncoder().encode(secret + "|" + ip);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2,"0")).join("");
}
async function record(request, response, env) {
  if (!env.DB || request.method === "OPTIONS") return;
  const url = new URL(request.url), path = url.pathname;
  if (path === "/admin" || path.startsWith("/admin/") || path.startsWith("/api/admin/")) return;
  const ua = request.headers.get("User-Agent") || "";
  const ai = aiBots.find(([, pattern]) => pattern.test(ua));
  const searchBot = searchBots.find(([, pattern]) => pattern.test(ua));
  const verified = request.cf?.botManagement?.verifiedBot === true;
  const claimed = ai || searchBot;
  const accept = request.headers.get("Accept") || "";
  const isAsset = /\.(?:css|js|mjs|png|jpe?g|webp|gif|svg|ico|woff2?|ttf|map|pdf|xml|txt|mp4|webm)$/i.test(path);
  const isCrawlerResource = /\/(?:robots\.txt|sitemap(?:-[^/]+)?\.xml|llms\.txt)$/i.test(path);
  let eventType = isAsset ? "asset_request" : "other_request";
  let actorCategory = "human", actorLabel = null, identityVerified = 0, source = "other";
  const referrerHost = host(request.headers.get("Referer"));
  if (claimed) {
    actorCategory = verified ? (ai ? "ai_crawler" : "search_crawler") : (ai ? "ai_claim_unverified" : "search_claim_unverified");
    actorLabel = claimed[0];
    identityVerified = verified ? 1 : 0;
    eventType = isCrawlerResource ? "crawler_resource_request" : "crawler_request";
  } else if (accept.includes("text/html") && !isAsset) {
    eventType = "human_pageview";
    source = sourceFor(url, referrerHost);
  }
  const parts = path.split("/").filter(Boolean);
  const language = locales.has((parts[0] || "").toLowerCase()) ? parts[0].toLowerCase() : null;
  const hash = eventType === "human_pageview" ? await visitorHash(request, env) : null;
  try {
    await ensureAnalyticsSchema(env);
    await env.DB.prepare(`INSERT INTO site_analytics_events
      (path, method, status, country, language, user_agent, referrer_host, source_category, event_type, actor_category, actor_label, identity_verified, visitor_hash)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(path.slice(0,1000), request.method, response.status, request.cf?.country || null, language, ua.slice(0,500), referrerHost || null, source, eventType, actorCategory, actorLabel, identityVerified, hash).run();
  } catch (error) { console.error("Site analytics event could not be stored"); }
}
export async function onRequest(context) {
  const response = await context.next();
  const task = record(context.request, response, context.env);
  context.waitUntil(task);
  return response;
}
