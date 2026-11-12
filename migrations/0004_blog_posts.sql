CREATE TABLE IF NOT EXISTS blog_posts (
 id INTEGER PRIMARY KEY AUTOINCREMENT, slug TEXT NOT NULL UNIQUE, title_en TEXT NOT NULL,
 summary_en TEXT NOT NULL DEFAULT '', content_en TEXT NOT NULL DEFAULT '', cover_image_url TEXT NOT NULL DEFAULT '',
 category TEXT NOT NULL DEFAULT '', tags_json TEXT NOT NULL DEFAULT '[]', author TEXT NOT NULL DEFAULT '',
 seo_title_en TEXT NOT NULL DEFAULT '', seo_description_en TEXT NOT NULL DEFAULT '',
 translations_json TEXT NOT NULL DEFAULT '{}',
 status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','published','archived')),
 published_at TEXT, created_at TEXT NOT NULL DEFAULT(datetime('now')), updated_at TEXT NOT NULL DEFAULT(datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_blog_posts_status_published ON blog_posts(status,published_at DESC);
CREATE INDEX IF NOT EXISTS idx_blog_posts_updated ON blog_posts(updated_at DESC);