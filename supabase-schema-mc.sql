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

-- Seed the domains — they match the TGSP Drive areas (changed 18 Nov 2026).
-- ClickUp list ids reuse the old lists until TGSP lists exist in ClickUp.
INSERT INTO mc_domains (key, label, mission, clickup_list_id, icon, sort_order) VALUES
('marketing',  'Marketing',  'Brand, pre-sales, lead generation and community outreach — filling The Grandstand to 3,000 members.', '901614361994', '', 1),
('retention',  'Retention',  'Member experience, engagement and keeping members — attendance, connects and cancellations.',         '901614361998', '', 2),
('operations', 'Operations', 'Running the club day to day — staff, timetable, member services and systems.',                       '901614361992', '', 3),
('financial',  'Financial',  'Budget, cash flow and reporting against the agreed budget.',                                         '901614362004', '', 4),
('technology', 'Technology', 'The tech stack — Hapana, EGYM, ScreenCloud, RFID and the My apps.',                                  '901614361996', '', 5),
('suppliers',  'Suppliers',  'Supplier selection, contracts and fitout delivery.',                                                 '901614409703', '', 6),
('general',    'General',    'Cross-domain strategy and oversight.',                                                               '901614362004', '', 7)
ON CONFLICT (key) DO NOTHING;
