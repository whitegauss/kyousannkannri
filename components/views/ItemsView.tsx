'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import {
  SponsorshipItem,
  Sponsor,
  ItemType,
  ItemUsageStatus,
  EventRow,
  UserRole,
  ITEM_TYPE_LABELS,
  ITEM_USAGE_STATUS_LABELS,
  canWrite,
  canManageMembers,
} from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Package, Plus, Search, TrendingUp, Box, Wrench, Loader2, Trash2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const USAGE_STYLES: Record<ItemUsageStatus, string> = {
  pending: 'bg-slate-100 text-slate-600',
  received: 'bg-blue-100 text-blue-700',
  in_use: 'bg-amber-100 text-amber-700',
  used: 'bg-green-100 text-green-700',
  returned: 'bg-violet-100 text-violet-700',
};

const TYPE_ICONS: Record<ItemType, React.ReactNode> = {
  goods: <Box size={16} className="text-green-600" />,
  money: <TrendingUp size={16} className="text-blue-600" />,
  service: <Wrench size={16} className="text-violet-600" />,
};

const TYPE_BG: Record<ItemType, string> = {
  goods: 'bg-green-50',
  money: 'bg-blue-50',
  service: 'bg-violet-50',
};

type ItemWithSponsor = SponsorshipItem & { sponsors: { company_name: string } | null };

interface ItemsViewProps {
  event: EventRow;
  role: UserRole;
}

export default function ItemsView({ event, role }: ItemsViewProps) {
  const [items, setItems] = useState<ItemWithSponsor[]>([]);
  const [sponsors, setSponsors] = useState<Pick<Sponsor, 'id' | 'company_name'>[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<ItemType | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<ItemUsageStatus | 'all'>('all');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [newItem, setNewItem] = useState<Partial<SponsorshipItem & { sponsor_id: string }>>({
    type: 'goods',
    usage_status: 'pending',
    sponsor_id: '',
  });

  const writable = canWrite(role);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setLoadError(null);
      const [itemRes, sponsorRes] = await Promise.all([
        supabase
          .from('sponsorship_items')
          .select('*, sponsors(company_name)')
          .eq('event_id', event.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('sponsors')
          .select('id, company_name')
          .eq('event_id', event.id)
          .order('company_name'),
      ]);
      if (itemRes.error || sponsorRes.error) {
        setLoadError('データの読み込みに失敗しました。再読み込みしてください。');
      } else {
        setItems((itemRes.data ?? []) as ItemWithSponsor[]);
        setSponsors(sponsorRes.data ?? []);
      }
      setLoading(false);
    }
    load();
  }, [event.id]);

  const filtered = items.filter((i) => {
    const q = search.toLowerCase();
    const sponsorName = i.sponsors?.company_name?.toLowerCase() ?? '';
    const matchSearch = i.name.toLowerCase().includes(q) || sponsorName.includes(q);
    const matchType = filterType === 'all' || i.type === filterType;
    const matchStatus = filterStatus === 'all' || i.usage_status === filterStatus;
    return matchSearch && matchType && matchStatus;
  });

  const totalMoney = items
    .filter((i) => i.type === 'money' && i.amount)
    .reduce((s, i) => s + (i.amount ?? 0), 0);
  const goodsCount = items.filter((i) => i.type === 'goods').length;
  const serviceCount = items.filter((i) => i.type === 'service').length;
  const receivedCount = items.filter((i) => i.usage_status !== 'pending').length;

  async function handleAdd() {
    if (!newItem.name?.trim() || !newItem.sponsor_id) return;
    setSaveError(null);
    setSaving(true);
    const { data, error } = await supabase
      .from('sponsorship_items')
      .insert({
        event_id: event.id,
        sponsor_id: newItem.sponsor_id,
        type: newItem.type ?? 'goods',
        name: newItem.name.trim(),
        description: newItem.description ?? '',
        quantity: newItem.quantity ?? null,
        unit: newItem.unit ?? '',
        amount: newItem.amount ?? null,
        usage_status: newItem.usage_status ?? 'pending',
      })
      .select('*, sponsors(company_name)')
      .single();

    if (error) {
      setSaveError('保存に失敗しました。もう一度お試しください。');
      setSaving(false);
      return;
    }
    if (data) {
      setItems((prev) => [data as ItemWithSponsor, ...prev]);
      setShowAddDialog(false);
      setNewItem({ type: 'goods', usage_status: 'pending', sponsor_id: '' });
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm('このアイテムを削除しますか？')) return;
    const { error } = await supabase.from('sponsorship_items').delete().eq('id', id);
    if (!error) {
      setItems((prev) => prev.filter((i) => i.id !== id));
    }
  }

  return (
    <div className="p-6 space-y-5">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: <TrendingUp size={16} className="text-blue-600" />, bg: 'bg-blue-50', label: '協賛金合計', value: `¥${totalMoney.toLocaleString()}` },
          { icon: <Box size={16} className="text-green-600" />, bg: 'bg-green-50', label: '協賛品', value: `${goodsCount}件` },
          { icon: <Wrench size={16} className="text-violet-600" />, bg: 'bg-violet-50', label: '協賛サービス', value: `${serviceCount}件` },
          { icon: <Package size={16} className="text-amber-600" />, bg: 'bg-amber-50', label: '受領済み', value: `${receivedCount}/${items.length}件` },
        ].map(({ icon, bg, label, value }) => (
          <div key={label} className="bg-white rounded-xl border border-border p-4">
            <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center mb-3', bg)}>{icon}</div>
            <p className="text-lg font-bold text-slate-900">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="アイテム名・企業名で検索..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 bg-white" />
        </div>
        <Select value={filterType} onValueChange={(v) => setFilterType(v as ItemType | 'all')}>
          <SelectTrigger className="w-full sm:w-36 bg-white"><SelectValue placeholder="種類" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">すべての種類</SelectItem>
            {(Object.entries(ITEM_TYPE_LABELS) as [ItemType, string][]).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as ItemUsageStatus | 'all')}>
          <SelectTrigger className="w-full sm:w-36 bg-white"><SelectValue placeholder="状況" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">すべての状況</SelectItem>
            {(Object.entries(ITEM_USAGE_STATUS_LABELS) as [ItemUsageStatus, string][]).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        {writable && (
          <Button
            onClick={() => { setSaveError(null); setShowAddDialog(true); }}
            className="bg-blue-600 hover:bg-blue-700 gap-2 shrink-0"
          >
            <Plus size={16} />アイテムを追加
          </Button>
        )}
      </div>

      {loadError && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          <AlertCircle size={15} className="shrink-0" />
          {loadError}
        </div>
      )}

      <p className="text-xs text-muted-foreground">{filtered.length}件表示中（全{items.length}件）</p>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 size={24} className="animate-spin text-muted-foreground" /></div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block bg-white rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-slate-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">種類</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">アイテム名</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">協賛企業</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">数量 / 金額</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">受領日</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">状況</th>
                  {canManageMembers(role) && <th className="px-4 py-3" />}
                </tr>
              </thead>
              <tbody>
                {filtered.map((item, idx) => (
                  <tr key={item.id} className={cn('border-b border-border last:border-0 hover:bg-slate-50 transition-colors', idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50')}>
                    <td className="px-4 py-3">
                      <div className={cn('w-7 h-7 rounded-md flex items-center justify-center', TYPE_BG[item.type])}>{TYPE_ICONS[item.type]}</div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{item.description}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-sm">{item.sponsors?.company_name ?? '—'}</td>
                    <td className="px-4 py-3 text-right font-medium text-slate-700">
                      {item.type === 'money' && item.amount ? `¥${item.amount.toLocaleString()}` : ''}
                      {item.quantity != null ? `${item.quantity.toLocaleString()} ${item.unit}` : ''}
                      {!item.amount && item.quantity == null ? '—' : ''}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{item.received_at ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', USAGE_STYLES[item.usage_status])}>
                        {ITEM_USAGE_STATUS_LABELS[item.usage_status]}
                      </span>
                    </td>
                    {canManageMembers(role) && (
                      <td className="px-4 py-3">
                        <button onClick={() => handleDelete(item.id)} className="text-slate-300 hover:text-red-500 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="py-14 text-center text-muted-foreground">
                <Package size={28} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">{search ? '該当するアイテムが見つかりません' : 'アイテムがまだ登録されていません'}</p>
              </div>
            )}
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {filtered.map((item) => (
              <div key={item.id} className="bg-white rounded-xl border border-border p-4 flex items-start gap-3">
                <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0', TYPE_BG[item.type])}>{TYPE_ICONS[item.type]}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-slate-800 text-sm">{item.name}</p>
                    <span className={cn('text-xs px-1.5 py-0.5 rounded-full font-medium', USAGE_STYLES[item.usage_status])}>
                      {ITEM_USAGE_STATUS_LABELS[item.usage_status]}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{item.sponsors?.company_name}</p>
                  <p className="text-sm font-semibold text-slate-700 mt-1">
                    {item.type === 'money' && item.amount ? `¥${item.amount.toLocaleString()}` : ''}
                    {item.quantity != null ? `${item.quantity.toLocaleString()} ${item.unit}` : ''}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Add dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>協賛アイテムを追加</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-1.5">
              <Label>協賛企業 *</Label>
              <Select value={newItem.sponsor_id ?? ''} onValueChange={(v) => setNewItem((p) => ({ ...p, sponsor_id: v }))}>
                <SelectTrigger><SelectValue placeholder="企業を選択..." /></SelectTrigger>
                <SelectContent>
                  {sponsors.map((s) => <SelectItem key={s.id} value={s.id}>{s.company_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>種類 *</Label>
              <Select value={newItem.type ?? 'goods'} onValueChange={(v) => setNewItem((p) => ({ ...p, type: v as ItemType }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.entries(ITEM_TYPE_LABELS) as [ItemType, string][]).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>アイテム名 *</Label>
              <Input placeholder="例: ボールペン、協賛金" maxLength={100} value={newItem.name ?? ''} onChange={(e) => setNewItem((p) => ({ ...p, name: e.target.value }))} />
            </div>
            {newItem.type === 'money' ? (
              <div className="grid gap-1.5">
                <Label>金額（円）</Label>
                <Input type="number" min="0" max="999999999" placeholder="100000" value={newItem.amount ?? ''} onChange={(e) => setNewItem((p) => ({ ...p, amount: Number(e.target.value) || null }))} />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label>数量</Label>
                  <Input type="number" min="0" max="999999" value={newItem.quantity ?? ''} onChange={(e) => setNewItem((p) => ({ ...p, quantity: Number(e.target.value) || null }))} />
                </div>
                <div className="grid gap-1.5">
                  <Label>単位</Label>
                  <Input placeholder="個、本" maxLength={20} value={newItem.unit ?? ''} onChange={(e) => setNewItem((p) => ({ ...p, unit: e.target.value }))} />
                </div>
              </div>
            )}
            <div className="grid gap-1.5">
              <Label>受領状況</Label>
              <Select value={newItem.usage_status ?? 'pending'} onValueChange={(v) => setNewItem((p) => ({ ...p, usage_status: v as ItemUsageStatus }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.entries(ITEM_USAGE_STATUS_LABELS) as [ItemUsageStatus, string][]).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>説明・メモ</Label>
              <Textarea rows={2} maxLength={500} value={newItem.description ?? ''} onChange={(e) => setNewItem((p) => ({ ...p, description: e.target.value }))} />
            </div>
            {saveError && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                <AlertCircle size={14} className="shrink-0" />
                {saveError}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>キャンセル</Button>
            <Button onClick={handleAdd} disabled={!newItem.name?.trim() || !newItem.sponsor_id || saving} className="bg-blue-600 hover:bg-blue-700 gap-2">
              {saving && <Loader2 size={14} className="animate-spin" />}追加する
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
