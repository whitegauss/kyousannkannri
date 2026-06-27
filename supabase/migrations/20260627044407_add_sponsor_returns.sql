/*
# 協賛リターン管理テーブル (sponsor_returns)

## 概要
協賛企業に提供するリターン（特典・見返り）を管理するテーブル。
ロゴ掲載・パンフレット掲載・MC紹介・招待券など各種リターンの
対応状況をトラッキングする。

## テーブル: sponsor_returns
| カラム           | 型            | 説明                                          |
|---|---|---|
| id               | uuid PK       | 主キー                                        |
| event_id         | uuid FK       | 対象イベント（RLSスコープ用）                 |
| sponsor_id       | uuid FK       | 対象協賛企業                                  |
| title            | text          | リターン名（例: バナーへのロゴ掲載）          |
| category         | text          | カテゴリ（logo/pamphlet/mc/ticket/sns/banner/booth/other）|
| description      | text          | 詳細説明                                      |
| quantity         | integer       | 数量（招待券など）                            |
| deadline         | date          | 対応期限                                      |
| status           | text          | 状態（pending/in_progress/completed/cancelled）|
| completed_at     | timestamptz   | 完了日時                                      |
| notes            | text          | メモ                                          |
| created_at       | timestamptz   | 作成日時                                      |
| updated_at       | timestamptz   | 更新日時                                      |
*/

CREATE TABLE IF NOT EXISTS sponsor_returns (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id     uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  sponsor_id   uuid NOT NULL REFERENCES sponsors(id) ON DELETE CASCADE,
  title        text NOT NULL,
  category     text NOT NULL DEFAULT 'other',
  description  text NOT NULL DEFAULT '',
  quantity     integer,
  deadline     date,
  status       text NOT NULL DEFAULT 'pending',
  completed_at timestamptz,
  notes        text NOT NULL DEFAULT '',
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sponsor_returns_event_id_idx   ON sponsor_returns(event_id);
CREATE INDEX IF NOT EXISTS sponsor_returns_sponsor_id_idx ON sponsor_returns(sponsor_id);
CREATE INDEX IF NOT EXISTS sponsor_returns_status_idx     ON sponsor_returns(status);

ALTER TABLE sponsor_returns ENABLE ROW LEVEL SECURITY;

-- updated_at 自動更新トリガー
CREATE OR REPLACE FUNCTION public.update_sponsor_returns_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = '';

DROP TRIGGER IF EXISTS sponsor_returns_updated_at ON sponsor_returns;
CREATE TRIGGER sponsor_returns_updated_at
  BEFORE UPDATE ON sponsor_returns
  FOR EACH ROW EXECUTE FUNCTION public.update_sponsor_returns_updated_at();

-- ============================================================
-- RLS ポリシー: anon はデモイベントのみ操作可
-- ============================================================
CREATE POLICY "anon_select_sponsor_returns" ON sponsor_returns FOR SELECT
  TO anon USING (event_id = '00000000-0000-0000-0000-000000000001');

CREATE POLICY "anon_insert_sponsor_returns" ON sponsor_returns FOR INSERT
  TO anon WITH CHECK (event_id = '00000000-0000-0000-0000-000000000001');

CREATE POLICY "anon_update_sponsor_returns" ON sponsor_returns FOR UPDATE
  TO anon
  USING (event_id = '00000000-0000-0000-0000-000000000001')
  WITH CHECK (event_id = '00000000-0000-0000-0000-000000000001');

CREATE POLICY "anon_delete_sponsor_returns" ON sponsor_returns FOR DELETE
  TO anon USING (event_id = '00000000-0000-0000-0000-000000000001');

-- authenticated ユーザーは自分が属するイベントのみ（将来の認証対応用）
CREATE POLICY "auth_select_sponsor_returns" ON sponsor_returns FOR SELECT
  TO authenticated
  USING (
    event_id IN (
      SELECT event_id FROM public.event_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "auth_insert_sponsor_returns" ON sponsor_returns FOR INSERT
  TO authenticated
  WITH CHECK (
    event_id IN (
      SELECT event_id FROM public.event_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "auth_update_sponsor_returns" ON sponsor_returns FOR UPDATE
  TO authenticated
  USING (
    event_id IN (
      SELECT event_id FROM public.event_members WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    event_id IN (
      SELECT event_id FROM public.event_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "auth_delete_sponsor_returns" ON sponsor_returns FOR DELETE
  TO authenticated
  USING (
    event_id IN (
      SELECT event_id FROM public.event_members WHERE user_id = auth.uid()
    )
  );
