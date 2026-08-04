-- Real presence for the "N online" counter: clients heartbeat an anonymous
-- random session id every 30s and the API counts distinct sids seen recently.
-- Privacy: sid is a client-generated UUID in sessionStorage, never an account
-- or an IP. Rows are pruned opportunistically by /api/presence, so the table
-- stays at roughly the number of concurrent sessions.
CREATE TABLE IF NOT EXISTS presence (
  sid           VARCHAR(64) PRIMARY KEY,
  last_seen_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Both hot paths (count within the window, prune past the TTL) filter on
-- last_seen_at alone.
CREATE INDEX IF NOT EXISTS idx_presence_last_seen ON presence (last_seen_at);
