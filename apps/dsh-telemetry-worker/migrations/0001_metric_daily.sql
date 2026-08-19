CREATE TABLE IF NOT EXISTS metric_daily (
  day TEXT NOT NULL,
  event TEXT NOT NULL,
  app_version TEXT NOT NULL,
  channel TEXT NOT NULL,
  os_family TEXT NOT NULL,
  language TEXT NOT NULL,
  outcome TEXT NOT NULL,
  detail TEXT NOT NULL,
  bucket TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0 CHECK (count >= 0),
  PRIMARY KEY (
    day,
    event,
    app_version,
    channel,
    os_family,
    language,
    outcome,
    detail,
    bucket
  )
) WITHOUT ROWID;
