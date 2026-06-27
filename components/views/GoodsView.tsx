'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import {
  GoodsInventory,
  GoodsStatus,
  GoodsCategory,
  GOODS_STATUS_LABELS,
  GOODS_CATEGORY_LABELS,
  EventRow,
  UserRole,
  canWrite,
} from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
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
import {
  Archive,
  Plus,
  Search,
  Pencil,
  Trash2,
  MapPin,
  Package,
  ChevronDown,
  ChevronUp,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const STATUS_STYLES: Record<GoodsStatus, string> = {
  stored: 'bg-blue-100 text-blue-700',
  in_use: 'bg-amber-100 text-amber-700',
  returned: 'bg-green-100 text-green-700',
  disposed: 'bg-slate-100 text-slate-500',
};

const CATEGORY_STYLES: Record<GoodsCategory, string> = {
  goods: 'bg-violet-100 text-violet-700',
  equipment: 'bg-cyan-100 text-cyan-700',
  food: 'bg-orange-100 text-orange-700',
  other: 'bg-slate-100 text-slate-600',
};

const UNITS = ['個', '本', '枚', '箱', 'セット', '袋', '冊', 'kg', 'L', 'その他'];

interface GoodsViewProps {
  event: EventRow;
  role: UserRole;
}

type SortKey = 'name' | 'category' | 'storage_location' | 'status' | 'quantity';

type FormState = Partial<Omit<GoodsInventory, 'id' | 'event_id' | 'sponsorship_item_id' | 'created_at' | 'updated_at'>>;

const EMPTY_FORM: FormState = {
  name: '',
  category: 'goods',
  quantity: 1,
  quantity_in_use: 0,
  quantity_returned: 0,
  unit: '個',
  storage_location: '',
  status: 'stored',
  received_date: '',
  notes: '',
};

export default function GoodsView({ event, role }: GoodsViewProps) {
  const [items, setItems] = useState<GoodsInventory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<GoodsCategory | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<GoodsStatus | 'all'>('all');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortAsc, setSortAsc] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [showDialog, setShowDialog] = useState(false);
  const [editTarget, setEditTarget] = useState<GoodsInventory | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const writable = canWrite(role);

  useEffect(() => { load(); }, [event.id]);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from('goods_inventory')
      .select('*')
      .eq('event_id', event.id)
      .order('created_at', { ascending: false });
    setItems(data ?? []);
    setLoading(false);
  }

  function openAdd() {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setShowDialog(true);
  }

  function openEdit(item: GoodsInventory) {
    setEditTarget(item);
    setForm({
      name: item.name,
      category: item.category,
      quantity: item.quantity,
      quantity_in_use: item.quantity_in_use,
      quantity_returned: item.quantity_returned,
      unit: item.unit,
      storage_location: item.storage_location,
      status: item.status,
      received_date: item.received_date ?? '',
      notes: item.notes,
    });
    setShowDialog(true);
  }

  async function handleSave() {
    if (!form.name?.trim()) return;
    setSaving(true);
    const payload = {
      event_id: event.id,
      name: form.name.trim(),
      category: form.category ?? 'other',
      quantity: form.quantity ?? 0,
      quantity_in_use: form.quantity_in_use ?? 0,
      quantity_returned: form.quantity_returned ?? 0,
      unit: form.unit ?? '個',
      storage_location: form.storage_location ?? '',
      status: form.status ?? 'stored',
      received_date: form.received_date || null,
      notes: form.notes ?? '',
    };

    if (editTarget) {
      const { data, error } = await supabase
        .from('goods_inventory')
        .update(payload)
        .eq('id', editTarget.id)
        .select()
        .single();
      if (!error && data) {
        setItems((prev) => prev.map((i) => (i.id === editTarget.id ? data : i)));
      }
    } else {
      const { data, error } = await supabase
        .from('goods_inventory')
        .insert(payload)
        .select()
        .single();
      if (!error && data) {
        setItems((prev) => [data, ...prev]);
      }
    }
    setSaving(false);
    setShowDialog(false);
  }

  async function handleDelete(id: string) {
    if (!confirm('この物品を削除しますか？')) return;
    await supabase.from('goods_inventory').delete().eq('id', id);
    setItems((prev) => prev.filter((i) => i.id !== id));
    if (expandedId === id) setExpandedId(null);
  }

  async function handleStatusChange(item: GoodsInventory, status: GoodsStatus) {
    const { data, error } = await supabase
      .from('goods_inventory')
      .update({ status })
      .eq('id', item.id)
      .select()
      .single();
    if (!error && data) {
      setItems((prev) => prev.map((i) => (i.id === item.id ? data : i)));
    }
  }

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortAsc((v) => !v);
    else { setSortKey(key); setSortAsc(true); }
  }

  const filtered = items
    .filter((i) => {
      const matchSearch = i.name.toLowerCase().includes(search.toLowerCase()) ||
        i.storage_location.toLowerCase().includes(search.toLowerCase()) ||
        i.notes.toLowerCase().includes(search.toLowerCase());
      const matchCat = filterCategory === 'all' || i.category === filterCategory;
      const matchStatus = filterStatus === 'all' || i.status === filterStatus;
      return matchSearch && matchCat && matchStatus;
    })
    .sort((a, b) => {
      let va: string | number = a[sortKey] ?? '';
      let vb: string | number = b[sortKey] ?? '';
      if (typeof va === 'string') va = va.toLowerCase();
      if (typeof vb === 'string') vb = vb.toLowerCase();
      if (va < vb) return sortAsc ? -1 : 1;
      if (va > vb) return sortAsc ? 1 : -1;
      return 0;
    });

  // サマリー集計
  const totalItems = items.length;
  const totalQty = items.reduce((s, i) => s + i.quantity, 0);
  const storedCount = items.filter((i) => i.status === 'stored').length;
  const inUseCount = items.filter((i) => i.status === 'in_use').length;
  const returnedCount = items.filter((i) => i.status === 'returned').length;

  const SortIcon = ({ k }: { k: SortKey }) =>
    sortKey === k ? (sortAsc ? <ChevronUp size={12} /> : <ChevronDown size={12} />) : null;

  return (
    <div className="p-6 space-y-5">
      {/* サマリーカード */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: '品目数', value: totalItems, sub: '登録済み', color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: '総個数', value: `${totalQty}点`, sub: '全物品合計', color: 'text-slate-700', bg: 'bg-slate-50' },
          { label: '保管中', value: storedCount, sub: '品目', color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: '使用中', value: inUseCount, sub: '品目', color: 'text-amber-600', bg: 'bg-amber-50' },
        ].map(({ label, value, sub, color, bg }) => (
          <div key={label} className="bg-white rounded-xl border border-border p-4">
            <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center mb-3', bg)}>
              <Archive size={16} className={color} />
            </div>
            <p className="text-xl font-bold text-slate-900">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-xs text-slate-400 mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      {/* ステータス進捗バー */}
      {totalItems > 0 && (
        <div className="bg-white rounded-xl border border-border p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-slate-600">物品状態の内訳</p>
            <p className="text-xs text-muted-foreground">{totalItems}品目</p>
          </div>
          <div className="flex h-2.5 rounded-full overflow-hidden gap-0.5">
            {storedCount > 0 && (
              <div className="bg-blue-500 transition-all" style={{ width: `${(storedCount / totalItems) * 100}%` }} />
            )}
            {inUseCount > 0 && (
              <div className="bg-amber-400 transition-all" style={{ width: `${(inUseCount / totalItems) * 100}%` }} />
            )}
            {returnedCount > 0 && (
              <div className="bg-green-500 transition-all" style={{ width: `${(returnedCount / totalItems) * 100}%` }} />
            )}
            {items.filter((i) => i.status === 'disposed').length > 0 && (
              <div className="bg-slate-300 transition-all" style={{ width: `${(items.filter((i) => i.status === 'disposed').length / totalItems) * 100}%` }} />
            )}
          </div>
          <div className="flex items-center gap-4 mt-2 flex-wrap">
            {(Object.entries(GOODS_STATUS_LABELS) as [GoodsStatus, string][]).map(([s, label]) => {
              const count = items.filter((i) => i.status === s).length;
              if (count === 0) return null;
              return (
                <span key={s} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className={cn('w-2 h-2 rounded-full', {
                    stored: 'bg-blue-500',
                    in_use: 'bg-amber-400',
                    returned: 'bg-green-500',
                    disposed: 'bg-slate-300',
                  }[s])} />
                  {label} {count}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* ツールバー */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="品名・保管場所・備考で検索..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-white"
          />
        </div>
        <Select value={filterCategory} onValueChange={(v) => setFilterCategory(v as GoodsCategory | 'all')}>
          <SelectTrigger className="w-full sm:w-36 bg-white"><SelectValue placeholder="カテゴリ" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">すべてのカテゴリ</SelectItem>
            {(Object.entries(GOODS_CATEGORY_LABELS) as [GoodsCategory, string][]).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as GoodsStatus | 'all')}>
          <SelectTrigger className="w-full sm:w-36 bg-white"><SelectValue placeholder="状態" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">すべての状態</SelectItem>
            {(Object.entries(GOODS_STATUS_LABELS) as [GoodsStatus, string][]).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {writable && (
          <Button onClick={openAdd} className="bg-blue-600 hover:bg-blue-700 gap-2 shrink-0">
            <Plus size={16} />
            物品を登録
          </Button>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        {loading ? '読み込み中...' : `${filtered.length}件表示中（全${items.length}件）`}
      </p>

      {/* テーブル（デスクトップ） */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-14 bg-slate-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-20 text-center">
          <Package size={32} className="mx-auto text-slate-200 mb-3" />
          <p className="text-sm text-muted-foreground">物品が登録されていません</p>
          {writable && (
            <Button onClick={openAdd} variant="outline" className="mt-4 gap-2">
              <Plus size={14} />
              最初の物品を登録
            </Button>
          )}
        </div>
      ) : (
        <>
          {/* デスクトップ：テーブル */}
          <div className="hidden md:block bg-white rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-border">
                  {([
                    { key: 'name', label: '品名' },
                    { key: 'category', label: 'カテゴリ' },
                    { key: 'quantity', label: '個数' },
                    { key: 'storage_location', label: '保管場所' },
                    { key: 'status', label: '状態' },
                  ] as { key: SortKey; label: string }[]).map(({ key, label }) => (
                    <th
                      key={key}
                      className="text-left px-4 py-3 text-xs font-semibold text-slate-600 cursor-pointer hover:text-slate-900 select-none whitespace-nowrap"
                      onClick={() => toggleSort(key)}
                    >
                      <span className="flex items-center gap-1">{label}<SortIcon k={key} /></span>
                    </th>
                  ))}
                  <th className="px-4 py-3 text-xs font-semibold text-slate-600 text-right">操作</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <>
                    <tr
                      key={item.id}
                      className={cn(
                        'border-b border-border last:border-0 hover:bg-slate-50 transition-colors cursor-pointer',
                        expandedId === item.id && 'bg-blue-50/40'
                      )}
                      onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                            <Package size={13} className="text-slate-500" />
                          </div>
                          <span className="font-medium text-slate-800 truncate max-w-[180px]">{item.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', CATEGORY_STYLES[item.category])}>
                          {GOODS_CATEGORY_LABELS[item.category]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-baseline gap-0.5">
                          <span className="font-bold text-slate-900">{item.quantity}</span>
                          <span className="text-xs text-muted-foreground">{item.unit}</span>
                        </div>
                        {(item.quantity_in_use > 0 || item.quantity_returned > 0) && (
                          <div className="text-[10px] text-muted-foreground leading-tight">
                            {item.quantity_in_use > 0 && `使用中 ${item.quantity_in_use}`}
                            {item.quantity_in_use > 0 && item.quantity_returned > 0 && ' / '}
                            {item.quantity_returned > 0 && `返却 ${item.quantity_returned}`}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {item.storage_location ? (
                          <span className="flex items-center gap-1 text-slate-600 text-xs">
                            <MapPin size={11} className="text-muted-foreground shrink-0" />
                            {item.storage_location}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-300">未設定</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {writable ? (
                          <Select
                            value={item.status}
                            onValueChange={(v) => { handleStatusChange(item, v as GoodsStatus); }}
                          >
                            <SelectTrigger
                              className={cn('h-7 w-28 text-xs border-0 px-2 font-medium', STATUS_STYLES[item.status])}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {(Object.entries(GOODS_STATUS_LABELS) as [GoodsStatus, string][]).map(([k, v]) => (
                                <SelectItem key={k} value={k} className="text-xs">{v}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <span className={cn('text-xs px-2 py-1 rounded-full font-medium', STATUS_STYLES[item.status])}>
                            {GOODS_STATUS_LABELS[item.status]}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                          {writable && (
                            <>
                              <button
                                onClick={() => openEdit(item)}
                                className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
                              >
                                <Pencil size={13} />
                              </button>
                              <button
                                onClick={() => handleDelete(item.id)}
                                className="w-7 h-7 rounded-lg hover:bg-red-50 flex items-center justify-center text-slate-400 hover:text-red-500 transition-colors"
                              >
                                <Trash2 size={13} />
                              </button>
                            </>
                          )}
                          {expandedId === item.id ? <ChevronUp size={14} className="text-muted-foreground ml-1" /> : <ChevronDown size={14} className="text-muted-foreground ml-1" />}
                        </div>
                      </td>
                    </tr>
                    {/* 展開詳細行 */}
                    {expandedId === item.id && (
                      <tr key={`${item.id}-detail`} className="bg-blue-50/30 border-b border-border">
                        <td colSpan={6} className="px-6 py-4">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <p className="text-xs text-muted-foreground mb-0.5">受取日</p>
                              <p className="font-medium text-slate-700">{item.received_date || '—'}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground mb-0.5">使用中 / 返却済み</p>
                              <p className="font-medium text-slate-700">{item.quantity_in_use}{item.unit} / {item.quantity_returned}{item.unit}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground mb-0.5">在庫（保管中）</p>
                              <p className="font-medium text-slate-700">
                                {Math.max(0, item.quantity - item.quantity_in_use - item.quantity_returned)}{item.unit}
                              </p>
                            </div>
                            {item.notes && (
                              <div className="col-span-2 md:col-span-1">
                                <p className="text-xs text-muted-foreground mb-0.5">備考</p>
                                <p className="text-slate-600 text-xs leading-relaxed">{item.notes}</p>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>

          {/* モバイル：カード */}
          <div className="md:hidden space-y-3">
            {filtered.map((item) => (
              <Card key={item.id} className="overflow-hidden">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-800 truncate">{item.name}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-medium', CATEGORY_STYLES[item.category])}>
                          {GOODS_CATEGORY_LABELS[item.category]}
                        </span>
                        <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-medium', STATUS_STYLES[item.status])}>
                          {GOODS_STATUS_LABELS[item.status]}
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-lg font-bold text-slate-900">{item.quantity}<span className="text-xs font-normal ml-0.5">{item.unit}</span></p>
                    </div>
                  </div>
                  {item.storage_location && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <MapPin size={11} />
                      {item.storage_location}
                    </div>
                  )}
                  {item.notes && (
                    <p className="text-xs text-slate-500 leading-relaxed border-t border-border pt-2">{item.notes}</p>
                  )}
                  {writable && (
                    <div className="flex items-center gap-2 border-t border-border pt-2">
                      <Select value={item.status} onValueChange={(v) => handleStatusChange(item, v as GoodsStatus)}>
                        <SelectTrigger className={cn('h-7 flex-1 text-xs border-0 px-2 font-medium', STATUS_STYLES[item.status])}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(Object.entries(GOODS_STATUS_LABELS) as [GoodsStatus, string][]).map(([k, v]) => (
                            <SelectItem key={k} value={k} className="text-xs">{v}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <button onClick={() => openEdit(item)} className="w-7 h-7 rounded-lg border border-border flex items-center justify-center text-slate-400 hover:text-slate-600">
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => handleDelete(item.id)} className="w-7 h-7 rounded-lg border border-border flex items-center justify-center text-slate-400 hover:text-red-500">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* 追加・編集ダイアログ */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editTarget ? '物品を編集' : '物品を登録'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            {/* 品名 */}
            <div className="grid gap-1.5">
              <Label htmlFor="goods-name">品名 *</Label>
              <Input
                id="goods-name"
                placeholder="例: クリアファイル"
                maxLength={100}
                value={form.name ?? ''}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              />
            </div>

            {/* カテゴリ */}
            <div className="grid gap-1.5">
              <Label>カテゴリ</Label>
              <Select
                value={form.category ?? 'other'}
                onValueChange={(v) => setForm((p) => ({ ...p, category: v as GoodsCategory }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.entries(GOODS_CATEGORY_LABELS) as [GoodsCategory, string][]).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 個数・単位 */}
            <div className="grid grid-cols-3 gap-3">
              <div className="grid gap-1.5 col-span-1">
                <Label htmlFor="goods-qty">個数 *</Label>
                <Input
                  id="goods-qty"
                  type="number"
                  min="0"
                  value={form.quantity ?? 0}
                  onChange={(e) => setForm((p) => ({ ...p, quantity: parseInt(e.target.value) || 0 }))}
                />
              </div>
              <div className="grid gap-1.5 col-span-1">
                <Label>単位</Label>
                <Select
                  value={UNITS.includes(form.unit ?? '') ? (form.unit ?? '個') : 'その他'}
                  onValueChange={(v) => setForm((p) => ({ ...p, unit: v === 'その他' ? p.unit : v }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {UNITS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5 col-span-1">
                <Label htmlFor="goods-unit-custom">単位（直接入力）</Label>
                <Input
                  id="goods-unit-custom"
                  placeholder="個"
                  value={form.unit ?? '個'}
                  onChange={(e) => setForm((p) => ({ ...p, unit: e.target.value }))}
                />
              </div>
            </div>

            {/* 使用中・返却済み個数 */}
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="goods-in-use">使用中個数</Label>
                <Input
                  id="goods-in-use"
                  type="number"
                  min="0"
                  value={form.quantity_in_use ?? 0}
                  onChange={(e) => setForm((p) => ({ ...p, quantity_in_use: parseInt(e.target.value) || 0 }))}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="goods-returned">返却済み個数</Label>
                <Input
                  id="goods-returned"
                  type="number"
                  min="0"
                  value={form.quantity_returned ?? 0}
                  onChange={(e) => setForm((p) => ({ ...p, quantity_returned: parseInt(e.target.value) || 0 }))}
                />
              </div>
            </div>

            {/* 保管場所 */}
            <div className="grid gap-1.5">
              <Label htmlFor="goods-location">保管場所</Label>
              <Input
                id="goods-location"
                placeholder="例: A棟2F 倉庫③"
                maxLength={100}
                value={form.storage_location ?? ''}
                onChange={(e) => setForm((p) => ({ ...p, storage_location: e.target.value }))}
              />
            </div>

            {/* 状態・受取日 */}
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>状態</Label>
                <Select
                  value={form.status ?? 'stored'}
                  onValueChange={(v) => setForm((p) => ({ ...p, status: v as GoodsStatus }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.entries(GOODS_STATUS_LABELS) as [GoodsStatus, string][]).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="goods-date">受取日</Label>
                <Input
                  id="goods-date"
                  type="date"
                  value={form.received_date ?? ''}
                  onChange={(e) => setForm((p) => ({ ...p, received_date: e.target.value }))}
                />
              </div>
            </div>

            {/* 備考 */}
            <div className="grid gap-1.5">
              <Label htmlFor="goods-notes">備考</Label>
              <Textarea
                id="goods-notes"
                rows={2}
                placeholder="保管上の注意事項、使用予定など..."
                maxLength={500}
                value={form.notes ?? ''}
                onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>キャンセル</Button>
            <Button
              onClick={handleSave}
              disabled={!form.name?.trim() || saving}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {saving ? '保存中...' : editTarget ? '更新する' : '登録する'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
