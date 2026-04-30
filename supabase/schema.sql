-- Lucky Draw Platform — Schema v3 (Google Forms Flow)
-- Run this in your Supabase SQL editor

-- ─── Events ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  slug            TEXT NOT NULL UNIQUE,
  game_type       TEXT NOT NULL DEFAULT 'spin_wheel'
                   CHECK (game_type IN ('spin_wheel','number_match','anime_match')),
  -- Google Forms integration
  google_form_url TEXT,
  webhook_secret  TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  -- field_mappings: [{ formLabel: "Work Email", fieldKey: "email", required: true }, ...]
  form_fields     JSONB NOT NULL DEFAULT '[
    {"formLabel":"Full Name","fieldKey":"name","required":true},
    {"formLabel":"Work Email","fieldKey":"email","required":true},
    {"formLabel":"Phone Number","fieldKey":"phone_number","required":true},
    {"formLabel":"Company","fieldKey":"company","required":false},
    {"formLabel":"Designation","fieldKey":"designation","required":true}
  ]',
  -- UI customisation
  ui_config       JSONB NOT NULL DEFAULT '{}',
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Prizes ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS prizes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id        UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  rank            INT NOT NULL,
  name            TEXT NOT NULL,
  description     TEXT,
  image_url       TEXT,
  quantity        INT NOT NULL DEFAULT 1,
  is_grand_prize  BOOLEAN NOT NULL DEFAULT false,
  is_consolation  BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Designation Rules ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS designation_rules (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id        UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  label           TEXT,
  designations    TEXT[] NOT NULL,
  prize_rank      INT NOT NULL,
  win_probability INT NOT NULL CHECK (win_probability BETWEEN 0 AND 100)
);

-- ─── Registrations ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS registrations (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id              UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name                  TEXT NOT NULL,
  email                 TEXT NOT NULL,
  designation           TEXT NOT NULL DEFAULT 'Unknown',
  phone_number          TEXT NOT NULL DEFAULT '',
  company               TEXT,
  form_data             JSONB NOT NULL DEFAULT '{}',
  prize_rank_won        INT,
  prize_id              UUID REFERENCES prizes(id),
  prize_name            TEXT,
  prize_description     TEXT,
  prize_image_url       TEXT,
  is_grand_prize_winner BOOLEAN NOT NULL DEFAULT false,
  game_result           TEXT CHECK (game_result IN ('won','lost')),
  email_sent            BOOLEAN NOT NULL DEFAULT false,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Grand Prize Sessions ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sessions (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id                UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  is_active               BOOLEAN NOT NULL DEFAULT false,
  winner_registration_id  UUID REFERENCES registrations(id),
  started_at              TIMESTAMPTZ,
  ended_at                TIMESTAMPTZ,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Enable Realtime ──────────────────────────────────────────────────────────
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE registrations;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE sessions;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── Indexes ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_registrations_event_id  ON registrations(event_id);
CREATE INDEX IF NOT EXISTS idx_registrations_email     ON registrations(email);
CREATE INDEX IF NOT EXISTS idx_sessions_event_id       ON sessions(event_id);
CREATE INDEX IF NOT EXISTS idx_prizes_event_id         ON prizes(event_id);
CREATE INDEX IF NOT EXISTS idx_designation_rules_event ON designation_rules(event_id);
CREATE INDEX IF NOT EXISTS idx_events_slug             ON events(slug);

-- ─── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE events           ENABLE ROW LEVEL SECURITY;
ALTER TABLE prizes           ENABLE ROW LEVEL SECURITY;
ALTER TABLE designation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE registrations    ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions         ENABLE ROW LEVEL SECURITY;

-- Public (participant) policies
DROP POLICY IF EXISTS "Public read active events"   ON events;
DROP POLICY IF EXISTS "Public read prizes"          ON prizes;
DROP POLICY IF EXISTS "Public read rules"           ON designation_rules;
DROP POLICY IF EXISTS "Public insert registrations" ON registrations;
DROP POLICY IF EXISTS "Public read registrations"   ON registrations;
DROP POLICY IF EXISTS "Public update registrations" ON registrations;
DROP POLICY IF EXISTS "Public read sessions"        ON sessions;

CREATE POLICY "Public read active events"   ON events        FOR SELECT USING (is_active = true);
CREATE POLICY "Public read prizes"          ON prizes        FOR SELECT USING (true);
CREATE POLICY "Public read rules"           ON designation_rules FOR SELECT USING (true);
CREATE POLICY "Public insert registrations" ON registrations FOR INSERT WITH CHECK (true);
CREATE POLICY "Public read registrations"   ON registrations FOR SELECT USING (true);
CREATE POLICY "Public update registrations" ON registrations FOR UPDATE USING (true);
CREATE POLICY "Public read sessions"        ON sessions      FOR SELECT USING (true);

-- Service role (admin) policies
DROP POLICY IF EXISTS "Service all events"        ON events;
DROP POLICY IF EXISTS "Service all prizes"        ON prizes;
DROP POLICY IF EXISTS "Service all rules"         ON designation_rules;
DROP POLICY IF EXISTS "Service all registrations" ON registrations;
DROP POLICY IF EXISTS "Service all sessions"      ON sessions;

CREATE POLICY "Service all events"        ON events        FOR ALL USING (true);
CREATE POLICY "Service all prizes"        ON prizes        FOR ALL USING (true);
CREATE POLICY "Service all rules"         ON designation_rules FOR ALL USING (true);
CREATE POLICY "Service all registrations" ON registrations FOR ALL USING (true);
CREATE POLICY "Service all sessions"      ON sessions      FOR ALL USING (true);

