/*
# セキュリティ修正: SECURITY DEFINER 関数のハードニング

## 修正内容

### 1. Function Search Path Mutable (CWE-426 相当)
mutable な search_path を持つ関数は、攻撃者が search_path を細工することで
想定外のオブジェクト（テーブル・型など）を参照させる "search_path injection" が可能。
全関数に `SET search_path = ''` を付与し、テーブル参照をスキーマ修飾 (public.) で明示する。

### 2. Public Can Execute SECURITY DEFINER Function
`handle_new_user()` と `create_event_owner()` は auth.users / events テーブルの
INSERT トリガーとしてのみ呼ばれるべき内部関数。
anon / authenticated / PUBLIC から直接 RPC 呼び出しされるべきではないため
EXECUTE 権限を剥奪する。

### 3. update_goods_inventory_updated_at の search_path 修正
こちらは SECURITY DEFINER ではないが mutable search_path のため合わせて修正。
*/

-- ============================================================
-- handle_new_user: search_path 固定 + EXECUTE 剥奪
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture', '')
  )
  ON CONFLICT (id) DO UPDATE SET
    email      = EXCLUDED.email,
    full_name  = COALESCE(NULLIF(EXCLUDED.full_name, ''), public.profiles.full_name),
    avatar_url = COALESCE(NULLIF(EXCLUDED.avatar_url, ''), public.profiles.avatar_url),
    updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- ============================================================
-- create_event_owner: search_path 固定 + EXECUTE 剥奪
-- ============================================================
CREATE OR REPLACE FUNCTION public.create_event_owner()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.event_members (event_id, user_id, role)
  VALUES (NEW.id, NEW.created_by, 'owner')
  ON CONFLICT (event_id, user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

REVOKE EXECUTE ON FUNCTION public.create_event_owner() FROM PUBLIC, anon, authenticated;

-- ============================================================
-- update_goods_inventory_updated_at: search_path 固定
-- (SECURITY DEFINER ではないが mutable search_path を修正)
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_goods_inventory_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = '';
