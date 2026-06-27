'use client';

import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Building2,
  Package,
  Archive,
  Camera,
  FileText,
  ChevronLeft,
  ChevronRight,
  Zap,
  CalendarDays,
  ChevronDown,
  Gift,
} from 'lucide-react';
import { EventRow, UserRole, USER_ROLE_LABELS, USER_ROLE_COLORS } from '@/lib/types';

export type View = 'dashboard' | 'sponsors' | 'items' | 'goods' | 'returns' | 'photos' | 'report';

interface SidebarProps {
  currentView: View;
  onNavigate: (view: View) => void;
  collapsed: boolean;
  onToggle: () => void;
  event: EventRow;
  role: UserRole;
  onBackToEvents: () => void;
}

const navItems: { view: View; label: string; icon: React.ReactNode }[] = [
  { view: 'dashboard', label: 'ダッシュボード', icon: <LayoutDashboard size={18} /> },
  { view: 'sponsors', label: '協賛企業', icon: <Building2 size={18} /> },
  { view: 'items', label: '協賛品・協賛金', icon: <Package size={18} /> },
  { view: 'goods', label: '物品管理', icon: <Archive size={18} /> },
  { view: 'returns', label: 'リターン管理', icon: <Gift size={18} /> },
  { view: 'photos', label: '活動写真', icon: <Camera size={18} /> },
  { view: 'report', label: '報告書作成', icon: <FileText size={18} /> },
];

export default function Sidebar({
  currentView,
  onNavigate,
  collapsed,
  onToggle,
  event,
  role,
  onBackToEvents,
}: SidebarProps) {
  return (
    <aside
      className={cn(
        'relative flex flex-col bg-slate-900 text-white transition-all duration-300 ease-in-out shrink-0',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* Logo */}
      <div className={cn('flex items-center gap-3 px-4 py-4 border-b border-slate-700', collapsed && 'justify-center px-0')}>
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-500 shrink-0">
          <Zap size={16} className="text-white" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <p className="text-sm font-bold leading-tight text-white">FastSponsor</p>
            <p className="text-[10px] text-slate-400 leading-tight">協賛管理システム</p>
          </div>
        )}
      </div>

      {/* Event selector */}
      {!collapsed && (
        <button
          onClick={onBackToEvents}
          className="mx-3 mt-3 flex items-center gap-2.5 p-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors text-left group"
        >
          <CalendarDays size={14} className="text-slate-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-slate-200 truncate leading-tight">{event.name || 'イベント'}</p>
            <span className={cn('text-[10px] px-1.5 py-0.5 rounded font-medium mt-0.5 inline-block border', USER_ROLE_COLORS[role])}>
              {USER_ROLE_LABELS[role]}
            </span>
          </div>
          <ChevronDown size={12} className="text-slate-500 shrink-0 group-hover:text-slate-300 transition-colors" />
        </button>
      )}
      {collapsed && (
        <button
          onClick={onBackToEvents}
          className="mx-auto mt-3 w-9 h-9 flex items-center justify-center rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors"
          title="イベント切替"
        >
          <CalendarDays size={15} className="text-slate-400" />
        </button>
      )}

      {/* Navigation */}
      <nav className="flex-1 py-3 space-y-0.5 px-2 overflow-hidden">
        {navItems.map(({ view, label, icon }) => (
          <button
            key={view}
            onClick={() => onNavigate(view)}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
              currentView === view
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-800',
              collapsed && 'justify-center px-0'
            )}
            title={collapsed ? label : undefined}
          >
            <span className="shrink-0">{icon}</span>
            {!collapsed && <span className="truncate">{label}</span>}
          </button>
        ))}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={onToggle}
        className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center hover:bg-slate-600 transition-colors z-10"
      >
        {collapsed
          ? <ChevronRight size={12} className="text-slate-300" />
          : <ChevronLeft size={12} className="text-slate-300" />}
      </button>

      {/* Footer */}
      <div className={cn('px-4 py-3 border-t border-slate-700 text-center', collapsed && 'px-2')}>
        {!collapsed && <p className="text-[10px] text-slate-500">FastSponsor v1.0</p>}
      </div>
    </aside>
  );
}
