-- Run this in your Supabase SQL Editor to fix missing columns
-- This is safe to run even if some columns already exist

-- Add missing columns to events table
ALTER TABLE events ADD COLUMN IF NOT EXISTS google_form_url TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS webhook_secret TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT;

-- Make sure form_fields has the right default
ALTER TABLE events ALTER COLUMN form_fields SET DEFAULT '[
  {"formLabel":"Full Name","fieldKey":"name","required":true,"fieldType":"text"},
  {"formLabel":"Work Email","fieldKey":"email","required":true,"fieldType":"email"},
  {"formLabel":"Phone Number","fieldKey":"phone_number","required":true,"fieldType":"tel"},
  {"formLabel":"Company","fieldKey":"company","required":false,"fieldType":"text"},
  {"formLabel":"Designation","fieldKey":"designation","required":true,"fieldType":"text"}
]';

-- Make sure is_active has a default
ALTER TABLE events ALTER COLUMN is_active SET DEFAULT true;

-- Drop old linkedin columns if they exist
ALTER TABLE events DROP COLUMN IF EXISTS linkedin_company_url;
ALTER TABLE events DROP COLUMN IF EXISTS linkedin_share_text;

-- Fix RLS: drop and recreate all policies cleanly
DROP POLICY IF EXISTS "Public read active events"   ON events;
DROP POLICY IF EXISTS "Service all events"          ON events;
DROP POLICY IF EXISTS "Public read prizes"          ON prizes;
DROP POLICY IF EXISTS "Service all prizes"          ON prizes;
DROP POLICY IF EXISTS "Public read rules"           ON designation_rules;
DROP POLICY IF EXISTS "Service all rules"           ON designation_rules;
DROP POLICY IF EXISTS "Public insert registrations" ON registrations;
DROP POLICY IF EXISTS "Public read registrations"   ON registrations;
DROP POLICY IF EXISTS "Public update registrations" ON registrations;
DROP POLICY IF EXISTS "Service all registrations"   ON registrations;
DROP POLICY IF EXISTS "Public read sessions"        ON sessions;
DROP POLICY IF EXISTS "Service all sessions"        ON sessions;

CREATE POLICY "Public read active events"   ON events        FOR SELECT USING (is_active = true);
CREATE POLICY "Service all events"          ON events        FOR ALL   USING (true);
CREATE POLICY "Public read prizes"          ON prizes        FOR SELECT USING (true);
CREATE POLICY "Service all prizes"          ON prizes        FOR ALL   USING (true);
CREATE POLICY "Public read rules"           ON designation_rules FOR SELECT USING (true);
CREATE POLICY "Service all rules"           ON designation_rules FOR ALL   USING (true);
CREATE POLICY "Public insert registrations" ON registrations FOR INSERT WITH CHECK (true);
CREATE POLICY "Public read registrations"   ON registrations FOR SELECT USING (true);
CREATE POLICY "Public update registrations" ON registrations FOR UPDATE USING (true);
CREATE POLICY "Service all registrations"   ON registrations FOR ALL   USING (true);
CREATE POLICY "Public read sessions"        ON sessions      FOR SELECT USING (true);
CREATE POLICY "Service all sessions"        ON sessions      FOR ALL   USING (true);

-- Show all events to verify
SELECT id, name, slug, is_active, created_at FROM events ORDER BY created_at DESC;
