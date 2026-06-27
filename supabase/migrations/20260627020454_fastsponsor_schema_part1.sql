/*
# FastSponsor Schema Part 1 — profiles, events, event_members

Creates the core tables without circular FK references.
Events policies that reference event_members are added AFTER
event_members exists (in a separate migration).
*/

-- ============================================================
-- profiles
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  full_name text DEFAULT '',
  avatar_url text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_authenticated" ON profiles;
CREATE POLICY "profiles_select_authenticated" ON profiles FOR SELECT
TO authenticated USING (true);

DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT
TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE
TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_delete_own" ON profiles;
CREATE POLICY "profiles_delete_own" ON profiles FOR DELETE
TO authenticated USING (auth.uid() = id);

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture', '')
  )
  ON CONFLICT (id) DO UPDATE SET
    email      = EXCLUDED.email,
    full_name  = COALESCE(NULLIF(EXCLUDED.full_name, ''), profiles.full_name),
    avatar_url = COALESCE(NULLIF(EXCLUDED.avatar_url, ''), profiles.avatar_url),
    updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- events
-- ============================================================
CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT '',
  description text DEFAULT '',
  venue text DEFAULT '',
  start_date date,
  end_date date,
  expected_visitors integer DEFAULT 0,
  actual_visitors integer,
  status text NOT NULL DEFAULT 'planning'
    CHECK (status IN ('planning', 'active', 'completed')),
  organizer text DEFAULT '',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Temporary open INSERT so the trigger can run; tighter policy added in part 2
DROP POLICY IF EXISTS "events_insert_authenticated" ON events;
CREATE POLICY "events_insert_authenticated" ON events FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);

-- ============================================================
-- event_members
-- ============================================================
CREATE TABLE IF NOT EXISTS event_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'viewer'
    CHECK (role IN ('owner', 'admin', 'editor', 'viewer')),
  invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(event_id, user_id)
);

ALTER TABLE event_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "event_members_select" ON event_members;
CREATE POLICY "event_members_select" ON event_members FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM event_members em
    WHERE em.event_id = event_members.event_id
      AND em.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "event_members_insert_admins" ON event_members;
CREATE POLICY "event_members_insert_admins" ON event_members FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM event_members em
    WHERE em.event_id = event_members.event_id
      AND em.user_id = auth.uid()
      AND em.role IN ('owner', 'admin')
  )
);

DROP POLICY IF EXISTS "event_members_update_admins" ON event_members;
CREATE POLICY "event_members_update_admins" ON event_members FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM event_members em
    WHERE em.event_id = event_members.event_id
      AND em.user_id = auth.uid()
      AND em.role IN ('owner', 'admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM event_members em
    WHERE em.event_id = event_members.event_id
      AND em.user_id = auth.uid()
      AND em.role IN ('owner', 'admin')
  )
);

DROP POLICY IF EXISTS "event_members_delete_admins" ON event_members;
CREATE POLICY "event_members_delete_admins" ON event_members FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM event_members em
    WHERE em.event_id = event_members.event_id
      AND em.user_id = auth.uid()
      AND em.role IN ('owner', 'admin')
  )
);

-- Trigger: auto-add creator as owner
CREATE OR REPLACE FUNCTION create_event_owner()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO event_members (event_id, user_id, role)
  VALUES (NEW.id, NEW.created_by, 'owner')
  ON CONFLICT (event_id, user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_event_created ON events;
CREATE TRIGGER on_event_created
  AFTER INSERT ON events
  FOR EACH ROW EXECUTE FUNCTION create_event_owner();
