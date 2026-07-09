-- #2 plan persistence: a signed-in user's saved course planner.
-- One row per user; `data` holds the PlannerPersisted blob
-- ({ v, plans, activePlanIdByTerm }) so the client codec round-trips it.
CREATE TABLE IF NOT EXISTS planner_plans (
  user_id integer PRIMARY KEY REFERENCES admin_users(id) ON DELETE CASCADE,
  data jsonb NOT NULL,
  updated_at timestamp DEFAULT now() NOT NULL
);
