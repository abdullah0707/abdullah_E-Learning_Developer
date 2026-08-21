CREATE TABLE analytics_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  visitor_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  path TEXT,
  referrer TEXT,
  country TEXT,
  device TEXT,
  label TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_analytics_created ON analytics_events(created_at);
CREATE INDEX idx_analytics_path ON analytics_events(path);
CREATE INDEX idx_analytics_visitor ON analytics_events(visitor_id);
