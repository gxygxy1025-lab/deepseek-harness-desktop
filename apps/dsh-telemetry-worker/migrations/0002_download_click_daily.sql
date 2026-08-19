CREATE TABLE IF NOT EXISTS download_click_daily (
  day TEXT NOT NULL,
  country_code TEXT NOT NULL CHECK (length(country_code) = 2),
  release_version TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('nav', 'hero', 'terminal', 'install')),
  count INTEGER NOT NULL DEFAULT 0 CHECK (count >= 0),
  PRIMARY KEY (
    day,
    country_code,
    release_version,
    source
  )
) WITHOUT ROWID;
