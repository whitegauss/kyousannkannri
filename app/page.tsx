'use client';

import { useState } from 'react';
import { EventRow, UserRole } from '@/lib/types';
import Sidebar, { View } from '@/components/layout/Sidebar';
import Dashboard from '@/components/views/Dashboard';
import SponsorsView from '@/components/views/SponsorsView';
import ItemsView from '@/components/views/ItemsView';
import GoodsView from '@/components/views/GoodsView';
import ReturnsView from '@/components/views/ReturnsView';
import PhotosView from '@/components/views/PhotosView';
import ReportView from '@/components/views/ReportView';

const DEMO_EVENT: EventRow = {
  id: '00000000-0000-0000-0000-000000000001',
  name: 'デモイベント',
  description: '',
  venue: '',
  start_date: null,
  end_date: null,
  expected_visitors: 0,
  actual_visitors: null,
  status: 'planning',
  organizer: '',
  created_by: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const DEMO_ROLE: UserRole = 'owner';

const PAGE_TITLES: Record<View, { title: string; description: string }> = {
  dashboard: { title: 'ダッシュボード', description: '協賛管理の全体概要' },
  sponsors: { title: '協賛企業管理', description: '企業情報・交渉状況の管理' },
  items: { title: '協賛品・協賛金管理', description: '受領品と金銭の管理' },
  goods: { title: '物品管理', description: '物品の保管場所・個数・状態の管理' },
  returns: { title: 'リターン管理', description: '協賛企業へのお返し・特典の対応状況' },
  photos: { title: '活動写真管理', description: '報告書用の写真アーカイブ' },
  report: { title: '報告書作成', description: '協賛報告書の自動生成' },
};

export default function Home() {
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar
        currentView={currentView}
        onNavigate={setCurrentView}
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((v) => !v)}
        event={DEMO_EVENT}
        role={DEMO_ROLE}
        onBackToEvents={() => {}}
      />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <header className="h-16 bg-white border-b border-border flex items-center gap-4 px-6 shrink-0">
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-semibold text-slate-900 leading-tight">
              {PAGE_TITLES[currentView].title}
            </h1>
            <p className="text-xs text-muted-foreground">{PAGE_TITLES[currentView].description}</p>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 border border-amber-200 font-medium">
            デモモード（認証なし）
          </span>
        </header>
        <main className="flex-1 overflow-y-auto scrollbar-thin">
          {currentView === 'dashboard' && (
            <Dashboard event={DEMO_EVENT} role={DEMO_ROLE} onNavigate={setCurrentView} />
          )}
          {currentView === 'sponsors' && (
            <SponsorsView event={DEMO_EVENT} role={DEMO_ROLE} />
          )}
          {currentView === 'items' && (
            <ItemsView event={DEMO_EVENT} role={DEMO_ROLE} />
          )}
          {currentView === 'goods' && (
            <GoodsView event={DEMO_EVENT} role={DEMO_ROLE} />
          )}
          {currentView === 'returns' && (
            <ReturnsView event={DEMO_EVENT} role={DEMO_ROLE} />
          )}
          {currentView === 'photos' && (
            <PhotosView event={DEMO_EVENT} role={DEMO_ROLE} />
          )}
          {currentView === 'report' && (
            <ReportView event={DEMO_EVENT} role={DEMO_ROLE} />
          )}
        </main>
      </div>
    </div>
  );
}
