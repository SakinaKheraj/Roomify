-- Run with: npx wrangler d1 execute roomify-db --file=schema.sql
-- For local dev: npx wrangler d1 execute roomify-db --local --file=schema.sql

CREATE TABLE IF NOT EXISTS projects (
  id                   TEXT    PRIMARY KEY,
  owner_id             TEXT    NOT NULL,
  name                 TEXT,
  source_image_key     TEXT,               -- R2 key: projects/{id}/source.png
  rendered_image_key   TEXT,               -- R2 key: projects/{id}/rendered.png
  source_image_url     TEXT,               -- public-facing URL
  rendered_image_url   TEXT,               -- public-facing URL
  is_public            INTEGER NOT NULL DEFAULT 0,   -- 0=private 1=public
  style_id             TEXT,
  style_label          TEXT,
  style_emoji          TEXT,
  style_prompt_suffix  TEXT,
  timestamp            INTEGER NOT NULL,
  updated_at           TEXT    NOT NULL DEFAULT (datetime('now')),
  shared_by            TEXT,
  shared_at            TEXT
);

CREATE INDEX IF NOT EXISTS idx_projects_owner  ON projects (owner_id);
CREATE INDEX IF NOT EXISTS idx_projects_public ON projects (is_public);
CREATE INDEX IF NOT EXISTS idx_projects_ts     ON projects (timestamp DESC);
