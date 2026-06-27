'use client';

import { View } from './Sidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EventRow, UserRole, USER_ROLE_LABELS, USER_ROLE_COLORS } from '@/lib/types';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { Search, Bell, User as UserIcon, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';

const PAGE_TITLES: Record<View, { title: string; description: string }> = {
  dashboard: { title: 'ダッシュボード', description: '協賛管理の全体概要' },
  sponsors: { title: '協賛企業管理', description: '企業情報・交渉状況の管理' },
  items: { title: '協賛品・協賛金管理', description: '受領品と金銭の管理' },
  goods: { title: '物品管理', description: '物品の保管場所・個数・状態の管理' },
  returns: { title: 'リターン管理', description: '協賛企業へのお返し・特典の対応状況' },
  photos: { title: '活動写真管理', description: '報告書用の写真アーカイブ' },
  report: { title: '報告書作成', description: '協賛報告書の自動生成' },
};

interface HeaderProps {
  currentView: View;
  user: User;
  event: EventRow;
  role: UserRole;
  onProfile: () => void;
}

export default function Header({ currentView, user, event, role, onProfile }: HeaderProps) {
  const { title, description } = PAGE_TITLES[currentView];
  const avatarUrl = user.user_metadata?.avatar_url || user.user_metadata?.picture;
  const displayName = user.user_metadata?.full_name || user.user_metadata?.name || user.email || '';

  return (
    <header className="h-16 bg-white border-b border-border flex items-center gap-4 px-6 shrink-0">
      <div className="flex-1 min-w-0">
        <h1 className="text-base font-semibold text-slate-900 leading-tight">{title}</h1>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <div className="flex items-center gap-2">
        <div className="relative hidden md:block">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="検索..." className="pl-8 h-8 w-48 text-sm bg-slate-50" />
        </div>

        {/* Role badge */}
        <span className={cn('hidden sm:inline-flex items-center text-xs px-2 py-0.5 rounded-full border font-medium', USER_ROLE_COLORS[role])}>
          {USER_ROLE_LABELS[role]}
        </span>

        {/* User avatar */}
        <button
          onClick={onProfile}
          className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors"
          title="マイページ"
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="w-7 h-7 rounded-full object-cover ring-1 ring-slate-200" />
          ) : (
            <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center">
              <UserIcon size={13} className="text-blue-600" />
            </div>
          )}
          <span className="hidden md:block text-xs font-medium text-slate-700 max-w-[120px] truncate">{displayName}</span>
        </button>
      </div>
    </header>
  );
}
