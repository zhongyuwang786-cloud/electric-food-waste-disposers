const jsonHeaders = { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" };
let schemaReady;
export const analyticsJson = (status, body) => new Response(JSON.stringify(body), { status, headers: jsonHeaders });
export async function ensureAnalyticsSchema(env) {
  if (!env.DB) throw new Error("D1 binding DB is unavailable");
  if (!schemaReady) schemaReady = (async () => {
    await env.DB.prepare(`CREATE TABLE IF NOT EXISTS site_analytics_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_at TEXT NOT NULL DEFAULT (datetime('now')),
      path TEXT NOT NULL,
      method TEXT NOT NULL,
      status INTEGER NOT NULL,
      country TEXT,
      language TEXT,
      user_agent TEXT,
      referrer_host TEXT,
      source_category TEXT NOT NULL DEFAULT 'other',
      event_type TEXT NOT NULL,
      actor_category TEXT NOT NULL DEFAULT 'human',
      actor_label TEXT,
      identity_verified INTEGER NOT NULL DEFAULT 0,
      visitor_hash TEXT
    )`).run();
    await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_site_analytics_time ON site_analytics_events(event_at)").run();
    await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_site_analytics_type_time ON site_analytics_events(event_type, event_at)").run();
    await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_site_analytics_source_time ON site_analytics_events(source_category, event_at)").run();
  })().catch(error => { schemaReady = null; throw error; });
  return schemaReady;
}
