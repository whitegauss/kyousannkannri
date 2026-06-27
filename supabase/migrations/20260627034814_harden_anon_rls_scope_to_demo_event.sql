/*
# セキュリティ強化: anon ポリシーをデモイベントのみに限定

## 問題
前回追加した anon ポリシーは USING (true) のため、
デモイベント以外のデータへの読み書きも許可していた。
また events テーブルへの anon DELETE/INSERT は
データ全消滅・無制限イベント作成を可能にしていた。

## 変更内容

### events テーブル
- anon_insert_events を削除（匿名ユーザーは新規イベントを作れない）
- anon_delete_events を削除（デモイベントの誤削除・悪意による全データ消去を防止）
- anon_update_events を削除（匿名ユーザーはイベント設定を変更できない）
- anon_select_events: デモイベントのみに限定

### sponsors / sponsorship_items / activity_photos / goods_inventory
- SELECT / INSERT / UPDATE / DELETE すべてデモイベント ID に限定
  (event_id = '00000000-0000-0000-0000-000000000001')
- これにより他の event_id のデータへのアクセスを完全遮断

## セキュリティ境界
匿名ユーザーができること:
  - デモイベント配下の sponsors / items / photos / goods の CRUD のみ
匿名ユーザーができないこと:
  - 新規 event の作成
  - 既存 event の編集・削除
  - デモイベント以外のデータへの読み書き
*/

-- ============================================================
-- events: 危険な anon DML ポリシーを削除し SELECT のみデモに限定
-- ============================================================
DROP POLICY IF EXISTS "anon_insert_events" ON events;
DROP POLICY IF EXISTS "anon_update_events" ON events;
DROP POLICY IF EXISTS "anon_delete_events" ON events;

DROP POLICY IF EXISTS "anon_select_events" ON events;
CREATE POLICY "anon_select_events" ON events FOR SELECT
  TO anon
  USING (id = '00000000-0000-0000-0000-000000000001');

-- ============================================================
-- sponsors: デモイベントのみに限定
-- ============================================================
DROP POLICY IF EXISTS "anon_select_sponsors" ON sponsors;
CREATE POLICY "anon_select_sponsors" ON sponsors FOR SELECT
  TO anon
  USING (event_id = '00000000-0000-0000-0000-000000000001');

DROP POLICY IF EXISTS "anon_insert_sponsors" ON sponsors;
CREATE POLICY "anon_insert_sponsors" ON sponsors FOR INSERT
  TO anon
  WITH CHECK (event_id = '00000000-0000-0000-0000-000000000001');

DROP POLICY IF EXISTS "anon_update_sponsors" ON sponsors;
CREATE POLICY "anon_update_sponsors" ON sponsors FOR UPDATE
  TO anon
  USING (event_id = '00000000-0000-0000-0000-000000000001')
  WITH CHECK (event_id = '00000000-0000-0000-0000-000000000001');

DROP POLICY IF EXISTS "anon_delete_sponsors" ON sponsors;
CREATE POLICY "anon_delete_sponsors" ON sponsors FOR DELETE
  TO anon
  USING (event_id = '00000000-0000-0000-0000-000000000001');

-- ============================================================
-- sponsorship_items: デモイベントのみに限定
-- ============================================================
DROP POLICY IF EXISTS "anon_select_sponsorship_items" ON sponsorship_items;
CREATE POLICY "anon_select_sponsorship_items" ON sponsorship_items FOR SELECT
  TO anon
  USING (event_id = '00000000-0000-0000-0000-000000000001');

DROP POLICY IF EXISTS "anon_insert_sponsorship_items" ON sponsorship_items;
CREATE POLICY "anon_insert_sponsorship_items" ON sponsorship_items FOR INSERT
  TO anon
  WITH CHECK (event_id = '00000000-0000-0000-0000-000000000001');

DROP POLICY IF EXISTS "anon_update_sponsorship_items" ON sponsorship_items;
CREATE POLICY "anon_update_sponsorship_items" ON sponsorship_items FOR UPDATE
  TO anon
  USING (event_id = '00000000-0000-0000-0000-000000000001')
  WITH CHECK (event_id = '00000000-0000-0000-0000-000000000001');

DROP POLICY IF EXISTS "anon_delete_sponsorship_items" ON sponsorship_items;
CREATE POLICY "anon_delete_sponsorship_items" ON sponsorship_items FOR DELETE
  TO anon
  USING (event_id = '00000000-0000-0000-0000-000000000001');

-- ============================================================
-- activity_photos: デモイベントのみに限定
-- ============================================================
DROP POLICY IF EXISTS "anon_select_activity_photos" ON activity_photos;
CREATE POLICY "anon_select_activity_photos" ON activity_photos FOR SELECT
  TO anon
  USING (event_id = '00000000-0000-0000-0000-000000000001');

DROP POLICY IF EXISTS "anon_insert_activity_photos" ON activity_photos;
CREATE POLICY "anon_insert_activity_photos" ON activity_photos FOR INSERT
  TO anon
  WITH CHECK (event_id = '00000000-0000-0000-0000-000000000001');

DROP POLICY IF EXISTS "anon_update_activity_photos" ON activity_photos;
CREATE POLICY "anon_update_activity_photos" ON activity_photos FOR UPDATE
  TO anon
  USING (event_id = '00000000-0000-0000-0000-000000000001')
  WITH CHECK (event_id = '00000000-0000-0000-0000-000000000001');

DROP POLICY IF EXISTS "anon_delete_activity_photos" ON activity_photos;
CREATE POLICY "anon_delete_activity_photos" ON activity_photos FOR DELETE
  TO anon
  USING (event_id = '00000000-0000-0000-0000-000000000001');

-- ============================================================
-- goods_inventory: デモイベントのみに限定（既存ポリシーを上書き）
-- ============================================================
DROP POLICY IF EXISTS "anon_select_goods_inventory" ON goods_inventory;
CREATE POLICY "anon_select_goods_inventory" ON goods_inventory FOR SELECT
  TO anon
  USING (event_id = '00000000-0000-0000-0000-000000000001');

DROP POLICY IF EXISTS "anon_insert_goods_inventory" ON goods_inventory;
CREATE POLICY "anon_insert_goods_inventory" ON goods_inventory FOR INSERT
  TO anon
  WITH CHECK (event_id = '00000000-0000-0000-0000-000000000001');

DROP POLICY IF EXISTS "anon_update_goods_inventory" ON goods_inventory;
CREATE POLICY "anon_update_goods_inventory" ON goods_inventory FOR UPDATE
  TO anon
  USING (event_id = '00000000-0000-0000-0000-000000000001')
  WITH CHECK (event_id = '00000000-0000-0000-0000-000000000001');

DROP POLICY IF EXISTS "anon_delete_goods_inventory" ON goods_inventory;
CREATE POLICY "anon_delete_goods_inventory" ON goods_inventory FOR DELETE
  TO anon
  USING (event_id = '00000000-0000-0000-0000-000000000001');
