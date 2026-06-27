/*
# FastSponsor Schema Part 2 — event policies + sponsors + items + photos

Now that event_members exists, adds proper RLS policies to events,
then creates sponsors, sponsorship_items, and activity_photos.
*/

-- ============================================================
-- events — add policies that reference event_members
-- ============================================================
DROP POLICY IF EXISTS "events_select_members" ON events;
CREATE POLICY "events_select_members" ON events FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM event_members
    WHERE event_members.event_id = events.id
      AND event_members.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "events_update_admins" ON events;
CREATE POLICY "events_update_admins" ON events FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM event_members
    WHERE event_members.event_id = events.id
      AND event_members.user_id = auth.uid()
      AND event_members.role IN ('owner', 'admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM event_members
    WHERE event_members.event_id = events.id
      AND event_members.user_id = auth.uid()
      AND event_members.role IN ('owner', 'admin')
  )
);

DROP POLICY IF EXISTS "events_delete_owner" ON events;
CREATE POLICY "events_delete_owner" ON events FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM event_members
    WHERE event_members.event_id = events.id
      AND event_members.user_id = auth.uid()
      AND event_members.role = 'owner'
  )
);

-- ============================================================
-- sponsors
-- ============================================================
CREATE TABLE IF NOT EXISTS sponsors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  company_name text NOT NULL DEFAULT '',
  contact_name text DEFAULT '',
  contact_email text DEFAULT '',
  contact_phone text DEFAULT '',
  address text DEFAULT '',
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'negotiating', 'confirmed', 'declined', 'completed')),
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sponsors_event_id ON sponsors(event_id);
ALTER TABLE sponsors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sponsors_select_members" ON sponsors;
CREATE POLICY "sponsors_select_members" ON sponsors FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM event_members
    WHERE event_members.event_id = sponsors.event_id
      AND event_members.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "sponsors_insert_editors" ON sponsors;
CREATE POLICY "sponsors_insert_editors" ON sponsors FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM event_members
    WHERE event_members.event_id = sponsors.event_id
      AND event_members.user_id = auth.uid()
      AND event_members.role IN ('owner', 'admin', 'editor')
  )
);

DROP POLICY IF EXISTS "sponsors_update_editors" ON sponsors;
CREATE POLICY "sponsors_update_editors" ON sponsors FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM event_members
    WHERE event_members.event_id = sponsors.event_id
      AND event_members.user_id = auth.uid()
      AND event_members.role IN ('owner', 'admin', 'editor')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM event_members
    WHERE event_members.event_id = sponsors.event_id
      AND event_members.user_id = auth.uid()
      AND event_members.role IN ('owner', 'admin', 'editor')
  )
);

DROP POLICY IF EXISTS "sponsors_delete_admins" ON sponsors;
CREATE POLICY "sponsors_delete_admins" ON sponsors FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM event_members
    WHERE event_members.event_id = sponsors.event_id
      AND event_members.user_id = auth.uid()
      AND event_members.role IN ('owner', 'admin')
  )
);

-- ============================================================
-- sponsorship_items
-- ============================================================
CREATE TABLE IF NOT EXISTS sponsorship_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sponsor_id uuid NOT NULL REFERENCES sponsors(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'goods'
    CHECK (type IN ('goods', 'money', 'service')),
  name text NOT NULL DEFAULT '',
  description text DEFAULT '',
  quantity integer,
  unit text DEFAULT '',
  amount numeric,
  usage_status text NOT NULL DEFAULT 'pending'
    CHECK (usage_status IN ('pending', 'received', 'in_use', 'used', 'returned')),
  received_at date,
  used_at date,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_items_event_id ON sponsorship_items(event_id);
CREATE INDEX IF NOT EXISTS idx_items_sponsor_id ON sponsorship_items(sponsor_id);
ALTER TABLE sponsorship_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "items_select_members" ON sponsorship_items;
CREATE POLICY "items_select_members" ON sponsorship_items FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM event_members
    WHERE event_members.event_id = sponsorship_items.event_id
      AND event_members.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "items_insert_editors" ON sponsorship_items;
CREATE POLICY "items_insert_editors" ON sponsorship_items FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM event_members
    WHERE event_members.event_id = sponsorship_items.event_id
      AND event_members.user_id = auth.uid()
      AND event_members.role IN ('owner', 'admin', 'editor')
  )
);

DROP POLICY IF EXISTS "items_update_editors" ON sponsorship_items;
CREATE POLICY "items_update_editors" ON sponsorship_items FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM event_members
    WHERE event_members.event_id = sponsorship_items.event_id
      AND event_members.user_id = auth.uid()
      AND event_members.role IN ('owner', 'admin', 'editor')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM event_members
    WHERE event_members.event_id = sponsorship_items.event_id
      AND event_members.user_id = auth.uid()
      AND event_members.role IN ('owner', 'admin', 'editor')
  )
);

DROP POLICY IF EXISTS "items_delete_admins" ON sponsorship_items;
CREATE POLICY "items_delete_admins" ON sponsorship_items FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM event_members
    WHERE event_members.event_id = sponsorship_items.event_id
      AND event_members.user_id = auth.uid()
      AND event_members.role IN ('owner', 'admin')
  )
);

-- ============================================================
-- activity_photos
-- ============================================================
CREATE TABLE IF NOT EXISTS activity_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT '',
  description text DEFAULT '',
  url text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'other'
    CHECK (category IN ('preparation', 'event_day', 'summary', 'other')),
  taken_at date,
  tags text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_photos_event_id ON activity_photos(event_id);
ALTER TABLE activity_photos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "photos_select_members" ON activity_photos;
CREATE POLICY "photos_select_members" ON activity_photos FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM event_members
    WHERE event_members.event_id = activity_photos.event_id
      AND event_members.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "photos_insert_editors" ON activity_photos;
CREATE POLICY "photos_insert_editors" ON activity_photos FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM event_members
    WHERE event_members.event_id = activity_photos.event_id
      AND event_members.user_id = auth.uid()
      AND event_members.role IN ('owner', 'admin', 'editor')
  )
);

DROP POLICY IF EXISTS "photos_update_editors" ON activity_photos;
CREATE POLICY "photos_update_editors" ON activity_photos FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM event_members
    WHERE event_members.event_id = activity_photos.event_id
      AND event_members.user_id = auth.uid()
      AND event_members.role IN ('owner', 'admin', 'editor')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM event_members
    WHERE event_members.event_id = activity_photos.event_id
      AND event_members.user_id = auth.uid()
      AND event_members.role IN ('owner', 'admin', 'editor')
  )
);

DROP POLICY IF EXISTS "photos_delete_admins" ON activity_photos;
CREATE POLICY "photos_delete_admins" ON activity_photos FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM event_members
    WHERE event_members.event_id = activity_photos.event_id
      AND event_members.user_id = auth.uid()
      AND event_members.role IN ('owner', 'admin')
  )
);
