'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  EventRow,
  Sponsor,
  SponsorshipItem,
  ActivityPhoto,
  UserRole,
  SPONSOR_STATUS_LABELS,
  SponsorStatus,
  canWrite,
} from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Building2,
  Package,
  Camera,
  TrendingUp,
  CheckCircle2,
  CalendarDays,
  ArrowRight,
  PlusCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface DashboardProps {
  event: EventRow;
  role: UserRole;
  onNavigate: (view: 'sponsors' | 'items' | 'goods' | 'photos' | 'report') => void;
}

const statusColors: Record<SponsorStatus, string> = {
  pending: 'bg-slate-100 text-slate-600',
  negotiating: 'bg-amber-100 text-amber-700',
  confirmed: 'bg-blue-100 text-blue-700',
  declined: 'bg-red-100 text-red-600',
  completed: 'bg-green-100 text-green-700',
};

export default function Dashboard({ event, role, onNavigate }: DashboardProps) {
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [items, setItems] = useState<SponsorshipItem[]>([]);
  const [photoCount, setPhotoCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [sponsorRes, itemRes, photoRes] = await Promise.all([
        supabase.from('sponsors').select('*').eq('event_id', event.id).order('created_at', { ascending: false }),
        supabase.from('sponsorship_items').select('*').eq('event_id', event.id),
        supabase.from('activity_photos').select('id', { count: 'exact', head: true }).eq('event_id', event.id),
      ]);
      setSponsors(sponsorRes.data ?? []);
      setItems(itemRes.data ?? []);
      setPhotoCount(photoRes.count ?? 0);
      setLoading(false);
    }
    load();
  }, [event.id]);

  const totalMoney = items.filter((i) => i.type === 'money' && i.amount).reduce((s, i) => s + (i.amount ?? 0), 0);
  const confirmedSponsors = sponsors.filter((s) => s.status === 'confirmed' || s.status === 'completed').length;
  const receivedItems = items.filter((i) => i.usage_status !== 'pending').length;
  const progressPct = sponsors.length > 0 ? Math.round((confirmedSponsors / sponsors.length) * 100) : 0;

  const byStatus = sponsors.reduce<Record<SponsorStatus, number>>(
    (acc, s) => { acc[s.status] = (acc[s.status] ?? 0) + 1; return acc; },
    { pending: 0, negotiating: 0, confirmed: 0, declined: 0, completed: 0 }
  );

  const recentSponsors = [...sponsors].slice(0, 5);

  return (
    <div className="p-6 space-y-6">
      {/* Event banner */}
      <div className="rounded-xl bg-gradient-to-r from-slate-800 to-blue-900 text-white p-5 flex flex-col md:flex-row md:items-center gap-4">
        <div className="flex-1">
          {(event.start_date || event.end_date) && (
            <div className="flex items-center gap-2 mb-1">
              <CalendarDays size={14} className="text-blue-300" />
              <span className="text-xs text-blue-300 font-medium">
                {event.start_date}{event.end_date && event.end_date !== event.start_date ? ` 〜 ${event.end_date}` : ''}
              </span>
            </div>
          )}
          <h2 className="text-xl font-bold">{event.name || 'イベント名未設定'}</h2>
          {event.venue && <p className="text-sm text-slate-300 mt-0.5">{event.venue}</p>}
        </div>
        <div className="flex gap-6 shrink-0">
          <div className="text-center">
            <p className="text-2xl font-bold">
              {event.actual_visitors != null ? event.actual_visitors.toLocaleString() : '—'}
            </p>
            <p className="text-xs text-slate-400">来場者数</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">{sponsors.length}</p>
            <p className="text-xs text-slate-400">協賛企業数</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">{totalMoney > 0 ? `¥${(totalMoney / 10000).toFixed(0)}万` : '¥0'}</p>
            <p className="text-xs text-slate-400">協賛金総額</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<Building2 size={18} className="text-blue-600" />} iconBg="bg-blue-50" label="協賛企業" value={loading ? '…' : sponsors.length} sub={`確定 ${confirmedSponsors}社`} onClick={() => onNavigate('sponsors')} />
        <StatCard icon={<Package size={18} className="text-green-600" />} iconBg="bg-green-50" label="協賛アイテム" value={loading ? '…' : items.length} sub={`受領済み ${receivedItems}件`} onClick={() => onNavigate('items')} />
        <StatCard icon={<TrendingUp size={18} className="text-amber-600" />} iconBg="bg-amber-50" label="協賛金総額" value={totalMoney > 0 ? `¥${totalMoney.toLocaleString()}` : '¥0'} sub="確定分の合計" onClick={() => onNavigate('items')} />
        <StatCard icon={<Camera size={18} className="text-violet-600" />} iconBg="bg-violet-50" label="活動写真" value={loading ? '…' : photoCount} sub="枚登録済み" onClick={() => onNavigate('photos')} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Progress */}
        <Card className="col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-slate-700">協賛交渉 進捗状況</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-muted-foreground">確定 / 総数</span>
                <span className="font-semibold text-slate-700">{confirmedSponsors}/{sponsors.length}社</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-blue-600 rounded-full transition-all duration-500" style={{ width: `${progressPct}%` }} />
              </div>
              <p className="text-right text-xs text-muted-foreground mt-1">{progressPct}%</p>
            </div>
            {sponsors.length > 0 ? (
              <div className="space-y-2">
                {(Object.entries(byStatus) as [SponsorStatus, number][]).filter(([, c]) => c > 0).map(([status, count]) => (
                  <div key={status} className="flex items-center justify-between">
                    <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', statusColors[status])}>
                      {SPONSOR_STATUS_LABELS[status]}
                    </span>
                    <span className="text-sm font-semibold text-slate-700">{count}社</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4">
                <Building2 size={24} className="mx-auto text-slate-200 mb-2" />
                <p className="text-xs text-muted-foreground">協賛企業を追加してください</p>
                {canWrite(role) && (
                  <button onClick={() => onNavigate('sponsors')} className="mt-2 text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1 mx-auto">
                    <PlusCircle size={12} />企業を追加
                  </button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent */}
        <Card className="col-span-1 lg:col-span-2">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold text-slate-700">最近の更新</CardTitle>
            <button onClick={() => onNavigate('sponsors')} className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1">
              すべて見る <ArrowRight size={12} />
            </button>
          </CardHeader>
          <CardContent>
            {recentSponsors.length > 0 ? (
              <div className="space-y-3">
                {recentSponsors.map((s) => (
                  <div key={s.id} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                      <Building2 size={14} className="text-slate-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{s.company_name}</p>
                      <p className="text-xs text-muted-foreground">{s.contact_name}</p>
                    </div>
                    <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium shrink-0', statusColors[s.status])}>
                      {SPONSOR_STATUS_LABELS[s.status]}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10">
                <Building2 size={28} className="mx-auto text-slate-200 mb-2" />
                <p className="text-sm text-muted-foreground">まだデータがありません</p>
                <p className="text-xs text-slate-400 mt-1">左メニューから各項目を登録してください</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick actions — only for editors and above */}
      {canWrite(role) && (
        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-3">クイックアクション</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { icon: <Building2 size={20} className="text-blue-500" />, label: '企業を追加', view: 'sponsors' as const },
              { icon: <Package size={20} className="text-green-500" />, label: '協賛品を登録', view: 'items' as const },
              { icon: <Camera size={20} className="text-violet-500" />, label: '写真をアップロード', view: 'photos' as const },
              { icon: <CheckCircle2 size={20} className="text-amber-500" />, label: '報告書を生成', view: 'report' as const },
            ].map(({ icon, label, view }) => (
              <button
                key={view}
                onClick={() => onNavigate(view)}
                className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border bg-white hover:bg-slate-50 hover:border-slate-300 transition-all duration-150 group"
              >
                <div className="w-10 h-10 rounded-lg bg-slate-50 group-hover:bg-white flex items-center justify-center transition-colors">{icon}</div>
                <span className="text-xs font-medium text-slate-600 text-center">{label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, iconBg, label, value, sub, onClick }: {
  icon: React.ReactNode; iconBg: string; label: string;
  value: string | number; sub: string; onClick: () => void;
}) {
  return (
    <button onClick={onClick} className="text-left bg-white rounded-xl border border-border p-4 hover:shadow-sm hover:border-slate-300 transition-all duration-150 group">
      <div className="flex items-start justify-between mb-3">
        <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center', iconBg)}>{icon}</div>
        <ArrowRight size={14} className="text-slate-300 group-hover:text-slate-400 transition-colors mt-1" />
      </div>
      <p className="text-xl font-bold text-slate-900 leading-tight">{value}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
      <p className="text-xs text-slate-500 mt-1">{sub}</p>
    </button>
  );
}
