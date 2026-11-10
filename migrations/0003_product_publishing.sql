ALTER TABLE products ADD COLUMN published_at TEXT;
CREATE INDEX IF NOT EXISTS idx_products_published ON products(published_at);