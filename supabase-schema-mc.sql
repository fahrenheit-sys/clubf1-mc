-- ============================================================
-- MISSION CONTROL — Supabase schema (run once in the SQL Editor)
-- Shares the same Supabase project as the dashboard & hub.
-- ============================================================

-- Business domains (editable in the Table Editor: label, mission, context,
-- ClickUp list id, order, active). `context` feeds the AI advisor's prompt.
CREATE TABLE IF NOT EXISTS mc_domains (
  key             TEXT PRIMARY KEY,
  label           TEXT NOT NULL,
  mission         TEXT,
  context         TEXT DEFAULT '',
  clickup_list_id TEXT,
  icon            TEXT DEFAULT '',
  sort_order      INTEGER DEFAULT 0,
  is_active       BOOLEAN DEFAULT TRUE
);

-- The insight log: pending items await GM review; resolved items are history
-- (considered/ignored/executed/vaulted).
CREATE TABLE IF NOT EXISTS mc_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain      TEXT NOT NULL REFERENCES mc_domains(key),
  status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','resolved')),
  message     TEXT NOT NULL,
  source      TEXT DEFAULT 'System',
  outcome     TEXT,
  gm_note     TEXT,
  priority    TEXT,
  received_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_mc_logs_domain_status ON mc_logs(domain, status);
CREATE INDEX IF NOT EXISTS idx_mc_logs_received ON mc_logs(received_at DESC);

-- Seed the 8 domains (ClickUp list ids carried over from the worker).
INSERT INTO mc_domains (key, label, mission, clickup_list_id, icon, sort_order) VALUES
('operations', 'Operations',    'Internal systems and workflow efficiency.',     '901614361992', '',   1),
('brand',      'Brand',         'Brand equity and market communication.',        '901614361994', '',   2),
('tech',       'Tech',          'Infrastructure and technical scaling.',         '901614361996', '',   3),
('retention',  'Retention',     'Maximizing customer lifetime value.',           '901614361998', '',   4),
('sales',      'Sales',         'Driving revenue growth and conversion.',        '901614362000', '',   5),
('bizdev',     'Business Dev',  'Partnerships and opportunities.',               '901614362003', '',   6),
('build',      'Build & Fitout','Physical development and precinct fitout.',      '901614409703', '🏗️', 7),
('general',    'General',       'Cross-domain strategy and oversight.',          '901614362004', '🌐', 8)
ON CONFLICT (key) DO NOTHING;
