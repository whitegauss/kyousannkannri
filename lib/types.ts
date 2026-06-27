// ─── Role System ─────────────────────────────────────────────────────────────

export type UserRole = 'owner' | 'admin' | 'editor' | 'viewer';

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  owner: 'オーナー',
  admin: '管理者',
  editor: '編集者',
  viewer: '閲覧者',
};

export const USER_ROLE_COLORS: Record<UserRole, string> = {
  owner: 'bg-blue-100 text-blue-800 border-blue-200',
  admin: 'bg-violet-100 text-violet-800 border-violet-200',
  editor: 'bg-green-100 text-green-800 border-green-200',
  viewer: 'bg-slate-100 text-slate-600 border-slate-200',
};

// canWrite: editor and above
export function canWrite(role: UserRole): boolean {
  return role === 'owner' || role === 'admin' || role === 'editor';
}

// canManageMembers: admin and above
export function canManageMembers(role: UserRole): boolean {
  return role === 'owner' || role === 'admin';
}

// canDeleteEvent: owner only
export function canDeleteEvent(role: UserRole): boolean {
  return role === 'owner';
}

// ─── Domain Types ─────────────────────────────────────────────────────────────

export type SponsorStatus = 'pending' | 'negotiating' | 'confirmed' | 'declined' | 'completed';
export type ItemType = 'goods' | 'money' | 'service';
export type ItemUsageStatus = 'pending' | 'received' | 'in_use' | 'used' | 'returned';
export type PhotoCategory = 'preparation' | 'event_day' | 'summary' | 'other';
export type EventStatus = 'planning' | 'active' | 'completed';
export type GoodsStatus = 'stored' | 'in_use' | 'returned' | 'disposed';
export type GoodsCategory = 'goods' | 'equipment' | 'food' | 'other';

// ─── DB Row Types (match Supabase table columns) ──────────────────────────────

export interface Profile {
  id: string;
  email: string | null;
  full_name: string;
  avatar_url: string;
  created_at: string;
  updated_at: string;
}

export interface EventRow {
  id: string;
  name: string;
  description: string;
  venue: string;
  start_date: string | null;
  end_date: string | null;
  expected_visitors: number;
  actual_visitors: number | null;
  status: EventStatus;
  organizer: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface EventMember {
  id: string;
  event_id: string;
  user_id: string;
  role: UserRole;
  invited_by: string | null;
  created_at: string;
  // joined from profiles
  profile?: Profile;
}

export interface Sponsor {
  id: string;
  event_id: string;
  company_name: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  address: string;
  status: SponsorStatus;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface SponsorshipItem {
  id: string;
  sponsor_id: string;
  event_id: string;
  type: ItemType;
  name: string;
  description: string;
  quantity: number | null;
  unit: string;
  amount: number | null;
  usage_status: ItemUsageStatus;
  received_at: string | null;
  used_at: string | null;
  created_at: string;
  // joined
  sponsor?: { company_name: string };
}

export interface ActivityPhoto {
  id: string;
  event_id: string;
  title: string;
  description: string;
  url: string;
  category: PhotoCategory;
  taken_at: string | null;
  tags: string[];
  created_at: string;
}

// ─── Label Maps ───────────────────────────────────────────────────────────────

export const SPONSOR_STATUS_LABELS: Record<SponsorStatus, string> = {
  pending: '未対応',
  negotiating: '交渉中',
  confirmed: '確定',
  declined: '辞退',
  completed: '完了',
};

export const ITEM_TYPE_LABELS: Record<ItemType, string> = {
  goods: '協賛品',
  money: '協賛金',
  service: '協賛サービス',
};

export const ITEM_USAGE_STATUS_LABELS: Record<ItemUsageStatus, string> = {
  pending: '未受領',
  received: '受領済み',
  in_use: '使用中',
  used: '使用済み',
  returned: '返却済み',
};

export const PHOTO_CATEGORY_LABELS: Record<PhotoCategory, string> = {
  preparation: '準備期間',
  event_day: '当日の様子',
  summary: '振り返り',
  other: 'その他',
};

export const EVENT_STATUS_LABELS: Record<EventStatus, string> = {
  planning: '計画中',
  active: '開催中',
  completed: '完了',
};

// ─── Goods Inventory ──────────────────────────────────────────────────────────

export interface GoodsInventory {
  id: string;
  event_id: string;
  sponsorship_item_id: string | null;
  name: string;
  category: GoodsCategory;
  quantity: number;
  quantity_in_use: number;
  quantity_returned: number;
  unit: string;
  storage_location: string;
  status: GoodsStatus;
  received_date: string | null;
  notes: string;
  created_at: string;
  updated_at: string;
}

export const GOODS_STATUS_LABELS: Record<GoodsStatus, string> = {
  stored: '保管中',
  in_use: '使用中',
  returned: '返却済み',
  disposed: '廃棄済み',
};

export const GOODS_CATEGORY_LABELS: Record<GoodsCategory, string> = {
  goods: 'グッズ',
  equipment: '備品・機材',
  food: '食品・飲料',
  other: 'その他',
};

// ─── Sponsor Returns ───────────────────────────────────────────────────────────

export type ReturnCategory = 'logo' | 'pamphlet' | 'mc' | 'ticket' | 'sns' | 'banner' | 'booth' | 'other';
export type ReturnStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

export interface SponsorReturn {
  id: string;
  event_id: string;
  sponsor_id: string;
  title: string;
  category: ReturnCategory;
  description: string;
  quantity: number | null;
  deadline: string | null;
  status: ReturnStatus;
  completed_at: string | null;
  notes: string;
  created_at: string;
  updated_at: string;
}

export const RETURN_CATEGORY_LABELS: Record<ReturnCategory, string> = {
  logo: 'ロゴ掲載',
  pamphlet: 'パンフレット',
  mc: 'MC紹介',
  ticket: '招待券',
  sns: 'SNS投稿',
  banner: '横断幕・バナー',
  booth: 'ブース提供',
  other: 'その他',
};

export const RETURN_STATUS_LABELS: Record<ReturnStatus, string> = {
  pending: '未対応',
  in_progress: '対応中',
  completed: '完了',
  cancelled: 'キャンセル',
};
