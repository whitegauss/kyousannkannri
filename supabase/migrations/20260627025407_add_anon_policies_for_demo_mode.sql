/*
# デモモード対応: sponsors / sponsorship_items / activity_photos / events に anon ポリシー追加

## 概要
現在 RLS ポリシーが `TO authenticated` のみのため、認証なし（anon キー）での
デモモードでデータの読み書きができない。
anon + authenticated 両方を許可するポリシーを追加する。

## 変更内容
- sponsors: anon + authenticated で CRUD を許可
- sponsorship_items: anon + authenticated で CRUD を許可
- activity_photos: anon + authenticated で CRUD を許可
- events: anon + authenticated で SELECT / INSERT / UPDATE を許可

## 注意
認証機能を有効化した際はこれらのポリシーを削除し、
member ベースの既存ポリシーのみを残すこと。
*/

-- ============================================================
-- events — anon 用ポリシー追加
-- ============================================================
DROP POLICY IF EXISTS "anon_select_events" ON events;
CREATE POLICY "anon_select_events" ON events FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_events" ON events;
CREATE POLICY "anon_insert_events" ON events FOR INSERT
  TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_events" ON events;
CREATE POLICY "anon_update_events" ON events FOR UPDATE
  TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_events" ON events;
CREATE POLICY "anon_delete_events" ON events FOR DELETE
  TO anon USING (true);

-- ============================================================
-- sponsors — anon 用ポリシー追加
-- ============================================================
DROP POLICY IF EXISTS "anon_select_sponsors" ON sponsors;
CREATE POLICY "anon_select_sponsors" ON sponsors FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_sponsors" ON sponsors;
CREATE POLICY "anon_insert_sponsors" ON sponsors FOR INSERT
  TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_sponsors" ON sponsors;
CREATE POLICY "anon_update_sponsors" ON sponsors FOR UPDATE
  TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_sponsors" ON sponsors;
CREATE POLICY "anon_delete_sponsors" ON sponsors FOR DELETE
  TO anon USING (true);

-- ============================================================
-- sponsorship_items — anon 用ポリシー追加
-- ============================================================
DROP POLICY IF EXISTS "anon_select_sponsorship_items" ON sponsorship_items;
CREATE POLICY "anon_select_sponsorship_items" ON sponsorship_items FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_sponsorship_items" ON sponsorship_items;
CREATE POLICY "anon_insert_sponsorship_items" ON sponsorship_items FOR INSERT
  TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_sponsorship_items" ON sponsorship_items;
CREATE POLICY "anon_update_sponsorship_items" ON sponsorship_items FOR UPDATE
  TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_sponsorship_items" ON sponsorship_items;
CREATE POLICY "anon_delete_sponsorship_items" ON sponsorship_items FOR DELETE
  TO anon USING (true);

-- ============================================================
-- activity_photos — anon 用ポリシー追加
-- ============================================================
DROP POLICY IF EXISTS "anon_select_activity_photos" ON activity_photos;
CREATE POLICY "anon_select_activity_photos" ON activity_photos FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_activity_photos" ON activity_photos;
CREATE POLICY "anon_insert_activity_photos" ON activity_photos FOR INSERT
  TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_activity_photos" ON activity_photos;
CREATE POLICY "anon_update_activity_photos" ON activity_photos FOR UPDATE
  TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_activity_photos" ON activity_photos;
CREATE POLICY "anon_delete_activity_photos" ON activity_photos FOR DELETE
  TO anon USING (true);
