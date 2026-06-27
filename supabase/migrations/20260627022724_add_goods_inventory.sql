/*
# 物品在庫管理テーブル (goods_inventory)

## 概要
協賛で受け取った物品（グッズ・備品など）の現物管理テーブル。
保管場所・個数・状態を追跡し、イベント当日の物品運用を支援する。

## 新規テーブル

### `goods_inventory`
| カラム | 型 | 説明 |
|---|---|---|
| id | uuid PK | 主キー |
| event_id | uuid FK | 対象イベント |
| sponsorship_item_id | uuid FK nullable | 協賛アイテムとの紐付け（任意） |
| name | text | 品名 |
| category | text | カテゴリ（グッズ/備品/食品/その他） |
| quantity | integer | 総個数 |
| quantity_in_use | integer | 使用中個数 |
| quantity_returned | integer | 返却済み個数 |
| unit | text | 単位（個/本/枚/箱など） |
| storage_location | text | 保管場所 |
| status | text | 状態（stored/in_use/returned/disposed） |
| received_date | date | 受取日 |
| notes | text | 備考 |
| created_at | timestamptz | 作成日時 |
| updated_at | timestamptz | 更新日時 |

## セキュリティ
- RLS 有効
- デモモード（認証なし）のため anon + authenticated 両方に CRUD 許可
*/

CREATE TABLE IF NOT EXISTS goods_inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  sponsorship_item_id uuid REFERENCES sponsorship_items(id) ON DELETE SET NULL,
  name text NOT NULL,
  category text NOT NULL DEFAULT 'other',
  quantity integer NOT NULL DEFAULT 0,
  quantity_in_use integer NOT NULL DEFAULT 0,
  quantity_returned integer NOT NULL DEFAULT 0,
  unit text NOT NULL DEFAULT '個',
  storage_location text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'stored',
  received_date date,
  notes text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS goods_inventory_event_id_idx ON goods_inventory(event_id);
CREATE INDEX IF NOT EXISTS goods_inventory_status_idx ON goods_inventory(status);

ALTER TABLE goods_inventory ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_goods_inventory" ON goods_inventory;
CREATE POLICY "anon_select_goods_inventory" ON goods_inventory FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_goods_inventory" ON goods_inventory;
CREATE POLICY "anon_insert_goods_inventory" ON goods_inventory FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_goods_inventory" ON goods_inventory;
CREATE POLICY "anon_update_goods_inventory" ON goods_inventory FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_goods_inventory" ON goods_inventory;
CREATE POLICY "anon_delete_goods_inventory" ON goods_inventory FOR DELETE
  TO anon, authenticated USING (true);

-- updated_at 自動更新トリガー
CREATE OR REPLACE FUNCTION update_goods_inventory_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS goods_inventory_updated_at ON goods_inventory;
CREATE TRIGGER goods_inventory_updated_at
  BEFORE UPDATE ON goods_inventory
  FOR EACH ROW EXECUTE FUNCTION update_goods_inventory_updated_at();
