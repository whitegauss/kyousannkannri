'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import {
  SponsorReturn,
  Sponsor,
  ReturnCategory,
  ReturnStatus,
  EventRow,
  UserRole,
  RETURN_CATEGORY_LABELS,
  RETURN_STATUS_LABELS,
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
import {
  Gift,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  Loader2,
  Trash2,
  Pencil,
  ChevronDown,
  ChevronUp,
  Tag,
  CalendarDays,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<ReturnStatus, { pill: string; icon: React.ReactNode }> = {
  pending: {
    pill: 'bg-slate-100 text-slate-600 border-slate-200',
    icon: <Clock size={12} />,
  },
  in_progress: {
    pill: 'bg-amber-100 text-amber-700 border-amber-200',
    icon: <Loader2 size={12} />,
  },
  completed: {
    pill: 'bg-green-100 text-green-700 border-green-200',
    icon: <CheckCircle2 size={12} />,
  },
  cancelled: {
    pill: 'bg-red-50 text-red-500 border-red-200',
    icon: <XCircle size={12} />,
  },
};

const CATEGORY_ICONS: Record<ReturnCategory, string> = {
  logo: '🏷',
  pamphlet: '📄',
  mc: '🎤',
  ticket: '🎟',
  sns: '📱',
  banner: '🪧',
  booth: '🏠',
  other: '🎁',
};

const STATUS_ORDER: ReturnStatus[] = ['pending', 'in_progress', 'completed', 'cancelled'];

type SponsorReturnWithSponsor = SponsorReturn & { sponsors: { company_name: string } | null };

const EMPTY_FORM: Partial<SponsorReturn & { sponsor_id: string }> = {
  title: '',
  category: 'other',
  description: '',
  quantity: undefined,
  deadline: '',
  status: 'pending',
  notes: '',
  sponsor_id: '',
};

interface ReturnsViewProps {
  event: EventRow;
  role: UserRole;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ReturnsView({ event, role }: ReturnsViewProps) {
  const [returns, setReturns] = useState<SponsorReturnWithSponsor[]>([]);
  const [sponsors, setSponsors] = useState<Pick<Sponsor, 'id' | 'company_name'>[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<ReturnStatus | 'all'>('all');
  const [filterCategory, setFilterCategory] = useState<ReturnCategory | 'all'>('all');
  const [filterSponsor, setFilterSponsor] = useState<string | 'all'>('all');
  const [groupBySponsor, setGroupBySponsor] = useState(false);

  const [showDialog, setShowDialog] = useState(false);
  const [editTarget, setEditTarget] = useState<SponsorReturnWithSponsor | null>(null);
  const [form, setForm] = useState<typeof EMPTY_FORM>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const writable = canWrite(role);

  useEffect(() => { load(); }, [event.id]);

  async function load() {
    setLoading(true);
    setLoadError(null);
    const [returnRes, sponsorRes] = await Promise.all([
      supabase
        .from('sponsor_returns')
        .select('*, sponsors(company_name)')
        .eq('event_id', event.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('sponsors')
        .select('id, company_name')
        .eq('event_id', event.id)
        .order('company_name'),
    ]);
    if (returnRes.error || sponsorRes.error) {
      setLoadError('データの読み込みに失敗しました。再読み込みしてください。');
    } else {
      setReturns((returnRes.data ?? []) as SponsorReturnWithSponsor[]);
      setSponsors(sponsorRes.data ?? []);
    }
    setLoading(false);
  }

  // ─── Filtering ──────────────────────────────────────────────────────────────

  const filtered = returns.filter((r) => {
    const q = search.toLowerCase();
    const sponsorName = r.sponsors?.company_name?.toLowerCase() ?? '';
    const matchSearch =
      r.title.toLowerCase().includes(q) ||
      sponsorName.includes(q) ||
      r.description.toLowerCase().includes(q);
    const matchStatus = filterStatus === 'all' || r.status === filterStatus;
    const matchCat = filterCategory === 'all' || r.category === filterCategory;
    const matchSponsor = filterSponsor === 'all' || r.sponsor_id === filterSponsor;
    return matchSearch && matchStatus && matchCat && matchSponsor;
  });

  // ─── Summary Stats ──────────────────────────────────────────────────────────

  const totalCount = returns.length;
  const completedCount = returns.filter((r) => r.status === 'completed').length;
  const inProgressCount = returns.filter((r) => r.status === 'in_progress').length;
  const pendingCount = returns.filter((r) => r.status === 'pending').length;
  const completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // ─── Grouping ───────────────────────────────────────────────────────────────

  const grouped: Record<string, { sponsor: Pick<Sponsor, 'id' | 'company_name'>; items: SponsorReturnWithSponsor[] }> = {};
  if (groupBySponsor) {
    for (const r of filtered) {
      if (!grouped[r.sponsor_id]) {
        const sp = sponsors.find((s) => s.id === r.sponsor_id);
        grouped[r.sponsor_id] = {
          sponsor: sp ?? { id: r.sponsor_id, company_name: r.sponsors?.company_name ?? '—' },
          items: [],
        };
      }
      grouped[r.sponsor_id].items.push(r);
    }
  }

  // ─── CRUD ───────────────────────────────────────────────────────────────────

  function openAdd() {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setSaveError(null);
    setShowDialog(true);
  }

  function openEdit(r: SponsorReturnWithSponsor, e?: React.MouseEvent) {
    e?.stopPropagation();
    setEditTarget(r);
    setForm({
      title: r.title,
      category: r.category,
      description: r.description,
      quantity: r.quantity ?? undefined,
      deadline: r.deadline ?? '',
      status: r.status,
      notes: r.notes,
      sponsor_id: r.sponsor_id,
    });
    setSaveError(null);
    setShowDialog(true);
  }

  async function handleSave() {
    if (!form.title?.trim() || !form.sponsor_id) return;
    setSaveError(null);
    setSaving(true);

    const now = new Date().toISOString();
    const payload = {
      event_id: event.id,
      sponsor_id: form.sponsor_id,
      title: form.title.trim(),
      category: form.category ?? 'other',
      description: form.description ?? '',
      quantity: form.quantity ?? null,
      deadline: form.deadline || null,
      status: form.status ?? 'pending',
      completed_at:
        form.status === 'completed'
          ? (editTarget?.completed_at ?? now)
          : null,
      notes: form.notes ?? '',
    };

    if (editTarget) {
      const { data, error } = await supabase
        .from('sponsor_returns')
        .update(payload)
        .eq('id', editTarget.id)
        .select('*, sponsors(company_name)')
        .single();
      if (error) { setSaveError('保存に失敗しました。もう一度お試しください。'); setSaving(false); return; }
      if (data) setReturns((prev) => prev.map((r) => (r.id === editTarget.id ? data as SponsorReturnWithSponsor : r)));
    } else {
      const { data, error } = await supabase
        .from('sponsor_returns')
        .insert(payload)
        .select('*, sponsors(company_name)')
        .single();
      if (error) { setSaveError('保存に失敗しました。もう一度お試しください。'); setSaving(false); return; }
      if (data) setReturns((prev) => [data as SponsorReturnWithSponsor, ...prev]);
    }

    setSaving(false);
    setShowDialog(false);
  }

  async function handleDelete(id: string, e?: React.MouseEvent) {
    e?.stopPropagation();
    if (!confirm('このリターンを削除しますか？')) return;
    const { error } = await supabase.from('sponsor_returns').delete().eq('id', id);
    if (!error) setReturns((prev) => prev.filter((r) => r.id !== id));
  }

  async function handleStatusChange(r: SponsorReturnWithSponsor, status: ReturnStatus) {
    const now = new Date().toISOString();
    const patch = {
      status,
      completed_at: status === 'completed' ? now : null,
    };
    const { data, error } = await supabase
      .from('sponsor_returns')
      .update(patch)
      .eq('id', r.id)
      .select('*, sponsors(company_name)')
      .single();
    if (!error && data) {
      setReturns((prev) => prev.map((x) => (x.id === r.id ? data as SponsorReturnWithSponsor : x)));
    }
  }

  // ─── Render Helpers ─────────────────────────────────────────────────────────

  function ReturnCard({ r }: { r: SponsorReturnWithSponsor }) {
    const s = STATUS_STYLES[r.status];
    const isOverdue =
      r.deadline && r.status !== 'completed' && r.status !== 'cancelled' &&
      new Date(r.deadline) < new Date();

    return (
      <div className={cn(
        'bg-white rounded-xl border border-border p-4 flex flex-col gap-3 transition-shadow hover:shadow-sm',
        r.status === 'completed' && 'opacity-75'
      )}>
        <div className="flex items-start gap-3">
          <div className="text-2xl leading-none shrink-0 mt-0.5">{CATEGORY_ICONS[r.category]}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className={cn('text-sm font-semibold text-slate-800', r.status === 'completed' && 'line-through text-slate-400')}>
                {r.title}
              </p>
              <span className={cn('inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium', s.pill)}>
                {s.icon}{RETURN_STATUS_LABELS[r.status]}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-1 flex-wrap text-xs text-muted-foreground">
              <span className="font-medium text-slate-600">{r.sponsors?.company_name ?? '—'}</span>
              <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">
                {RETURN_CATEGORY_LABELS[r.category]}
              </span>
              {r.quantity != null && <span>{r.quantity}点</span>}
              {r.deadline && (
                <span className={cn('flex items-center gap-1', isOverdue && 'text-red-500 font-semibold')}>
                  <CalendarDays size={11} />
                  {isOverdue ? '期限超過: ' : '期限: '}{r.deadline}
                </span>
              )}
            </div>
            {r.description && (
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed line-clamp-2">{r.description}</p>
            )}
          </div>
        </div>

        {/* Status quick-change */}
        {writable && (
          <div className="flex items-center gap-2 pt-1 border-t border-border">
            <Tag size={11} className="text-muted-foreground shrink-0" />
            <div className="flex gap-1 flex-wrap flex-1">
              {STATUS_ORDER.map((st) => (
                <button
                  key={st}
                  onClick={() => handleStatusChange(r, st)}
                  className={cn(
                    'text-[11px] px-2 py-0.5 rounded-full border transition-all',
                    r.status === st
                      ? STATUS_STYLES[st].pill + ' font-semibold'
                      : 'border-slate-200 text-slate-400 hover:border-slate-300 hover:text-slate-600'
                  )}
                >
                  {RETURN_STATUS_LABELS[st]}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={(e) => openEdit(r, e)}
                className="w-6 h-6 rounded flex items-center justify-center text-slate-300 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <Pencil size={12} />
              </button>
              {canManageMembers(role) && (
                <button
                  onClick={(e) => handleDelete(r.id, e)}
                  className="w-6 h-6 rounded flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                >
                  <Trash2 size={12} />
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 space-y-5">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'リターン総数', value: totalCount, icon: <Gift size={16} className="text-blue-600" />, bg: 'bg-blue-50' },
          { label: '未対応', value: pendingCount, icon: <Clock size={16} className="text-slate-500" />, bg: 'bg-slate-50' },
          { label: '対応中', value: inProgressCount, icon: <Loader2 size={16} className="text-amber-600" />, bg: 'bg-amber-50' },
          { label: '完了率', value: `${completionRate}%`, icon: <CheckCircle2 size={16} className="text-green-600" />, bg: 'bg-green-50' },
        ].map(({ label, value, icon, bg }) => (
          <div key={label} className="bg-white rounded-xl border border-border p-4">
            <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center mb-3', bg)}>{icon}</div>
            <p className="text-xl font-bold text-slate-900">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      {totalCount > 0 && (
        <div className="bg-white rounded-xl border border-border px-5 py-3 flex items-center gap-4">
          <p className="text-xs text-muted-foreground shrink-0">対応進捗</p>
          <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full transition-all duration-500"
              style={{ width: `${completionRate}%` }}
            />
          </div>
          <p className="text-xs font-semibold text-slate-700 shrink-0">{completedCount}/{totalCount}件完了</p>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="リターン名・企業名で検索..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-white"
          />
        </div>
        <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as ReturnStatus | 'all')}>
          <SelectTrigger className="w-full sm:w-36 bg-white"><SelectValue placeholder="状況" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">すべての状況</SelectItem>
            {(Object.entries(RETURN_STATUS_LABELS) as [ReturnStatus, string][]).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterCategory} onValueChange={(v) => setFilterCategory(v as ReturnCategory | 'all')}>
          <SelectTrigger className="w-full sm:w-40 bg-white"><SelectValue placeholder="カテゴリー" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">すべてのカテゴリー</SelectItem>
            {(Object.entries(RETURN_CATEGORY_LABELS) as [ReturnCategory, string][]).map(([k, v]) => (
              <SelectItem key={k} value={k}>{CATEGORY_ICONS[k]} {v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterSponsor} onValueChange={setFilterSponsor}>
          <SelectTrigger className="w-full sm:w-44 bg-white"><SelectValue placeholder="企業で絞り込み" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">すべての企業</SelectItem>
            {sponsors.map((s) => <SelectItem key={s.id} value={s.id}>{s.company_name}</SelectItem>)}
          </SelectContent>
        </Select>
        <button
          onClick={() => setGroupBySponsor((v) => !v)}
          className={cn(
            'flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium transition-colors shrink-0',
            groupBySponsor
              ? 'bg-blue-50 border-blue-300 text-blue-700'
              : 'bg-white border-border text-slate-600 hover:bg-slate-50'
          )}
        >
          {groupBySponsor ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          企業別グループ
        </button>
        {writable && (
          <Button onClick={openAdd} className="bg-blue-600 hover:bg-blue-700 gap-2 shrink-0">
            <Plus size={16} />リターンを追加
          </Button>
        )}
      </div>

      {loadError && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          <AlertCircle size={15} className="shrink-0" />{loadError}
        </div>
      )}

      <p className="text-xs text-muted-foreground">{filtered.length}件表示中（全{returns.length}件）</p>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground bg-white rounded-xl border border-border">
          <Gift size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">{search ? '該当するリターンが見つかりません' : 'リターンがまだ登録されていません'}</p>
          {writable && !search && (
            <Button variant="outline" size="sm" className="mt-4 gap-1.5" onClick={openAdd}>
              <Plus size={14} />最初のリターンを追加
            </Button>
          )}
        </div>
      ) : groupBySponsor ? (
        // ─── Grouped view ───────────────────────────────────────────────
        <div className="space-y-6">
          {Object.values(grouped).map(({ sponsor, items }) => {
            const done = items.filter((r) => r.status === 'completed').length;
            return (
              <div key={sponsor.id}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                    <span className="text-blue-700 text-xs font-bold">{sponsor.company_name.slice(0, 1)}</span>
                  </div>
                  <p className="text-sm font-semibold text-slate-800">{sponsor.company_name}</p>
                  <span className="text-xs text-muted-foreground ml-auto">{done}/{items.length}件完了</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-2 border-l-2 border-blue-100 ml-3">
                  {items.map((r) => <ReturnCard key={r.id} r={r} />)}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        // ─── Flat grid ──────────────────────────────────────────────────
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map((r) => <ReturnCard key={r.id} r={r} />)}
        </div>
      )}

      {/* Add / Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editTarget ? 'リターンを編集' : 'リターンを追加'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-1.5">
              <Label>協賛企業 *</Label>
              <Select
                value={form.sponsor_id ?? ''}
                onValueChange={(v) => setForm((p) => ({ ...p, sponsor_id: v }))}
              >
                <SelectTrigger><SelectValue placeholder="企業を選択..." /></SelectTrigger>
                <SelectContent>
                  {sponsors.map((s) => <SelectItem key={s.id} value={s.id}>{s.company_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>リターン名 *</Label>
              <Input
                placeholder="例: 横断幕へのロゴ掲載"
                maxLength={100}
                value={form.title ?? ''}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>カテゴリー</Label>
                <Select
                  value={form.category ?? 'other'}
                  onValueChange={(v) => setForm((p) => ({ ...p, category: v as ReturnCategory }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.entries(RETURN_CATEGORY_LABELS) as [ReturnCategory, string][]).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{CATEGORY_ICONS[k]} {v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label>状態</Label>
                <Select
                  value={form.status ?? 'pending'}
                  onValueChange={(v) => setForm((p) => ({ ...p, status: v as ReturnStatus }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.entries(RETURN_STATUS_LABELS) as [ReturnStatus, string][]).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>数量</Label>
                <Input
                  type="number"
                  min="0"
                  max="9999"
                  placeholder="例: 10"
                  value={form.quantity ?? ''}
                  onChange={(e) => setForm((p) => ({ ...p, quantity: Number(e.target.value) || undefined }))}
                />
              </div>
              <div className="grid gap-1.5">
                <Label>対応期限</Label>
                <Input
                  type="date"
                  value={form.deadline ?? ''}
                  onChange={(e) => setForm((p) => ({ ...p, deadline: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label>詳細説明</Label>
              <Textarea
                rows={2}
                maxLength={500}
                placeholder="掲載サイズ・条件・注意事項など..."
                value={form.description ?? ''}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>メモ</Label>
              <Textarea
                rows={2}
                maxLength={500}
                placeholder="対応者・進捗メモなど..."
                value={form.notes ?? ''}
                onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              />
            </div>
            {saveError && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                <AlertCircle size={14} className="shrink-0" />{saveError}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>キャンセル</Button>
            <Button
              onClick={handleSave}
              disabled={!form.title?.trim() || !form.sponsor_id || saving}
              className="bg-blue-600 hover:bg-blue-700 gap-2"
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              {editTarget ? '更新する' : '追加する'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
