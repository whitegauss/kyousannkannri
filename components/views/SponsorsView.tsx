'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Sponsor,
  SponsorshipItem,
  SponsorStatus,
  EventRow,
  UserRole,
  SPONSOR_STATUS_LABELS,
  ITEM_TYPE_LABELS,
  ITEM_USAGE_STATUS_LABELS,
  canWrite,
  canManageMembers,
} from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  Building2, Plus, Search, Phone, Mail, MapPin,
  ChevronRight, ArrowLeft, Package, StickyNote, Loader2, Trash2, Pencil, AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const STATUS_STYLES: Record<SponsorStatus, string> = {
  pending: 'bg-slate-100 text-slate-600 border-slate-200',
  negotiating: 'bg-amber-50 text-amber-700 border-amber-200',
  confirmed: 'bg-blue-50 text-blue-700 border-blue-200',
  declined: 'bg-red-50 text-red-600 border-red-200',
  completed: 'bg-green-50 text-green-700 border-green-200',
};

const EMPTY_FORM: Partial<Sponsor> = {
  company_name: '',
  contact_name: '',
  contact_email: '',
  contact_phone: '',
  address: '',
  status: 'pending',
  notes: '',
};

interface SponsorsViewProps {
  event: EventRow;
  role: UserRole;
}

export default function SponsorsView({ event, role }: SponsorsViewProps) {
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<SponsorStatus | 'all'>('all');
  const [selectedSponsor, setSelectedSponsor] = useState<Sponsor | null>(null);
  const [sponsorItems, setSponsorItems] = useState<SponsorshipItem[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [editTarget, setEditTarget] = useState<Sponsor | null>(null);
  const [form, setForm] = useState<Partial<Sponsor>>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const writable = canWrite(role);

  useEffect(() => { loadSponsors(); }, [event.id]);

  async function loadSponsors() {
    setLoading(true);
    setLoadError(null);
    const { data, error } = await supabase
      .from('sponsors')
      .select('*')
      .eq('event_id', event.id)
      .order('created_at', { ascending: false });
    if (error) {
      setLoadError('協賛企業の読み込みに失敗しました。再読み込みしてください。');
    } else {
      setSponsors(data ?? []);
    }
    setLoading(false);
  }

  async function openDetail(s: Sponsor) {
    setSelectedSponsor(s);
    const { data } = await supabase
      .from('sponsorship_items')
      .select('*')
      .eq('sponsor_id', s.id)
      .order('created_at');
    setSponsorItems(data ?? []);
  }

  function openAdd() {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setSaveError(null);
    setShowDialog(true);
  }

  function openEdit(s: Sponsor, e?: React.MouseEvent) {
    e?.stopPropagation();
    setEditTarget(s);
    setSaveError(null);
    setForm({
      company_name: s.company_name,
      contact_name: s.contact_name,
      contact_email: s.contact_email,
      contact_phone: s.contact_phone,
      address: s.address,
      status: s.status,
      notes: s.notes,
    });
    setShowDialog(true);
  }

  async function handleSave() {
    if (!form.company_name?.trim()) return;
    setSaveError(null);
    setSaving(true);

    const payload = {
      event_id: event.id,
      company_name: form.company_name.trim(),
      contact_name: form.contact_name ?? '',
      contact_email: form.contact_email ?? '',
      contact_phone: form.contact_phone ?? '',
      address: form.address ?? '',
      status: form.status ?? 'pending',
      notes: form.notes ?? '',
    };

    if (editTarget) {
      const { data, error } = await supabase
        .from('sponsors')
        .update(payload)
        .eq('id', editTarget.id)
        .select()
        .single();
      if (error) { setSaveError('保存に失敗しました。もう一度お試しください。'); setSaving(false); return; }
      if (data) {
        setSponsors((prev) => prev.map((s) => (s.id === editTarget.id ? data : s)));
        if (selectedSponsor?.id === editTarget.id) setSelectedSponsor(data);
      }
    } else {
      const { data, error } = await supabase
        .from('sponsors')
        .insert(payload)
        .select()
        .single();
      if (error) { setSaveError('保存に失敗しました。もう一度お試しください。'); setSaving(false); return; }
      if (data) {
        setSponsors((prev) => [data, ...prev]);
      }
    }

    setSaving(false);
    setShowDialog(false);
  }

  async function handleDelete(id: string) {
    if (!confirm('この企業を削除しますか？関連する協賛アイテムもすべて削除されます。')) return;
    await supabase.from('sponsors').delete().eq('id', id);
    setSponsors((prev) => prev.filter((s) => s.id !== id));
    if (selectedSponsor?.id === id) setSelectedSponsor(null);
  }

  async function handleStatusChange(s: Sponsor, status: SponsorStatus) {
    const { data, error } = await supabase
      .from('sponsors')
      .update({ status })
      .eq('id', s.id)
      .select()
      .single();
    if (!error && data) {
      setSponsors((prev) => prev.map((sp) => (sp.id === s.id ? data : sp)));
      if (selectedSponsor?.id === s.id) setSelectedSponsor(data);
    }
  }

  const filtered = sponsors.filter((s) => {
    const q = search.toLowerCase();
    const matchSearch = s.company_name.toLowerCase().includes(q) ||
      s.contact_name.toLowerCase().includes(q) ||
      s.contact_email.toLowerCase().includes(q);
    const matchStatus = filterStatus === 'all' || s.status === filterStatus;
    return matchSearch && matchStatus;
  });

  // ── 詳細ビュー ────────────────────────────────────────────────
  if (selectedSponsor) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setSelectedSponsor(null)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-slate-700 transition-colors"
          >
            <ArrowLeft size={15} />企業一覧に戻る
          </button>
          {writable && (
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => openEdit(selectedSponsor, e)}
              className="gap-1.5 text-xs"
            >
              <Pencil size={13} />編集
            </Button>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-5">
          <Card className="flex-1">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                    <Building2 size={22} className="text-blue-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 text-lg leading-tight">{selectedSponsor.company_name}</p>
                    {selectedSponsor.contact_name && (
                      <p className="text-sm text-muted-foreground">{selectedSponsor.contact_name}</p>
                    )}
                  </div>
                </div>
                {writable ? (
                  <Select
                    value={selectedSponsor.status}
                    onValueChange={(v) => handleStatusChange(selectedSponsor, v as SponsorStatus)}
                  >
                    <SelectTrigger className={cn('h-7 w-28 text-xs border px-2 font-medium shrink-0', STATUS_STYLES[selectedSponsor.status])}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.entries(SPONSOR_STATUS_LABELS) as [SponsorStatus, string][]).map(([k, v]) => (
                        <SelectItem key={k} value={k} className="text-xs">{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <span className={cn('text-xs px-2.5 py-1 rounded-full border font-medium shrink-0', STATUS_STYLES[selectedSponsor.status])}>
                    {SPONSOR_STATUS_LABELS[selectedSponsor.status]}
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {selectedSponsor.contact_email && <InfoRow icon={<Mail size={14} />} label="メール" value={selectedSponsor.contact_email} />}
              {selectedSponsor.contact_phone && <InfoRow icon={<Phone size={14} />} label="電話" value={selectedSponsor.contact_phone} />}
              {selectedSponsor.address && <InfoRow icon={<MapPin size={14} />} label="住所" value={selectedSponsor.address} />}
              {selectedSponsor.notes && (
                <div className="pt-3 border-t border-border flex items-start gap-2">
                  <StickyNote size={14} className="text-muted-foreground mt-0.5 shrink-0" />
                  <p className="text-sm text-slate-600 leading-relaxed">{selectedSponsor.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex flex-col gap-4 sm:w-48">
            <Card>
              <CardContent className="pt-4 pb-4 text-center">
                <p className="text-2xl font-bold text-slate-900">{sponsorItems.length}</p>
                <p className="text-xs text-muted-foreground mt-1">協賛アイテム数</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4 text-center">
                <p className="text-xl font-bold text-slate-900">
                  ¥{sponsorItems.filter((i) => i.type === 'money' && i.amount).reduce((s, i) => s + (i.amount ?? 0), 0).toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground mt-1">協賛金合計</p>
              </CardContent>
            </Card>
            {canManageMembers(role) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDelete(selectedSponsor.id)}
                className="gap-1.5 text-red-500 hover:text-red-600 hover:border-red-200 text-xs"
              >
                <Trash2 size={13} />削除
              </Button>
            )}
          </div>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Package size={16} className="text-slate-500" />
              <CardTitle className="text-sm">協賛アイテム一覧</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {sponsorItems.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">協賛アイテムがまだありません</p>
            ) : (
              <div className="space-y-3">
                {sponsorItems.map((item) => (
                  <div key={item.id} className="flex items-start gap-3 p-3 rounded-lg border border-border bg-slate-50">
                    <div className="w-8 h-8 rounded-lg bg-white border border-border flex items-center justify-center shrink-0">
                      <Package size={14} className="text-slate-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-slate-800">{item.name}</p>
                        <span className="text-xs bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded">{ITEM_TYPE_LABELS[item.type]}</span>
                      </div>
                      {item.description && <p className="text-xs text-muted-foreground">{item.description}</p>}
                      <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                        {item.type === 'money' && item.amount && (
                          <span className="font-semibold text-slate-700">¥{item.amount.toLocaleString()}</span>
                        )}
                        {item.quantity != null && <span>{item.quantity.toLocaleString()} {item.unit}</span>}
                        <span className={cn('px-1.5 py-0.5 rounded font-medium',
                          item.usage_status === 'used' ? 'bg-green-100 text-green-700' :
                          item.usage_status === 'received' ? 'bg-blue-100 text-blue-700' :
                          item.usage_status === 'in_use' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
                        )}>
                          {ITEM_USAGE_STATUS_LABELS[item.usage_status]}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── 一覧ビュー ────────────────────────────────────────────────
  return (
    <div className="p-6 space-y-5">
      {/* サマリー */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {([
          { label: '総企業数', value: sponsors.length },
          { label: '確定', value: sponsors.filter((s) => s.status === 'confirmed').length, color: 'text-blue-600' },
          { label: '交渉中', value: sponsors.filter((s) => s.status === 'negotiating').length, color: 'text-amber-600' },
          { label: '完了', value: sponsors.filter((s) => s.status === 'completed').length, color: 'text-green-600' },
        ]).map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-xl border border-border p-3 text-center">
            <p className={cn('text-2xl font-bold', color ?? 'text-slate-900')}>{value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* ツールバー */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="企業名・担当者名・メールで検索..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-white"
          />
        </div>
        <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as SponsorStatus | 'all')}>
          <SelectTrigger className="w-full sm:w-36 bg-white"><SelectValue placeholder="ステータス" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">すべて</SelectItem>
            {(Object.entries(SPONSOR_STATUS_LABELS) as [SponsorStatus, string][]).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {writable && (
          <Button onClick={openAdd} className="bg-blue-600 hover:bg-blue-700 gap-2 shrink-0">
            <Plus size={16} />企業を追加
          </Button>
        )}
      </div>

      <p className="text-xs text-muted-foreground">{filtered.length}件表示中（全{sponsors.length}件）</p>

      {loadError && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          <AlertCircle size={15} className="shrink-0" />
          {loadError}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((s) => (
            <button
              key={s.id}
              onClick={() => openDetail(s)}
              className="text-left bg-white rounded-xl border border-border p-4 hover:shadow-sm hover:border-slate-300 transition-all duration-150 group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                  <Building2 size={18} className="text-blue-600" />
                </div>
                <div className="flex items-center gap-1">
                  <span className={cn('text-xs px-2 py-0.5 rounded-full border font-medium', STATUS_STYLES[s.status])}>
                    {SPONSOR_STATUS_LABELS[s.status]}
                  </span>
                  {writable && (
                    <button
                      onClick={(e) => openEdit(s, e)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-300 hover:text-slate-600 hover:bg-slate-100 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Pencil size={12} />
                    </button>
                  )}
                </div>
              </div>
              <p className="font-semibold text-slate-900 text-sm leading-tight mb-1">{s.company_name}</p>
              {s.contact_name && <p className="text-xs text-muted-foreground mb-3">{s.contact_name}</p>}
              <div className="space-y-1 text-xs text-slate-500">
                {s.contact_email && (
                  <div className="flex items-center gap-1.5">
                    <Mail size={11} /><span className="truncate">{s.contact_email}</span>
                  </div>
                )}
                {s.contact_phone && (
                  <div className="flex items-center gap-1.5">
                    <Phone size={11} /><span>{s.contact_phone}</span>
                  </div>
                )}
              </div>
              <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
                <span className="text-xs text-muted-foreground">詳細を見る</span>
                <ChevronRight size={14} className="text-slate-300 group-hover:text-slate-500 transition-colors" />
              </div>
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="col-span-full py-16 text-center text-muted-foreground">
              <Building2 size={32} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">
                {search || filterStatus !== 'all' ? '該当する企業が見つかりません' : '協賛企業がまだ登録されていません'}
              </p>
              {writable && !search && filterStatus === 'all' && (
                <Button onClick={openAdd} variant="outline" className="mt-4 gap-2">
                  <Plus size={14} />最初の企業を追加
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {/* 追加・編集ダイアログ */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editTarget ? '企業情報を編集' : '協賛企業を追加'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-1.5">
              <Label>企業名 *</Label>
              <Input
                placeholder="株式会社〇〇"
                maxLength={100}
                value={form.company_name ?? ''}
                onChange={(e) => setForm((p) => ({ ...p, company_name: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>担当者名</Label>
                <Input
                  placeholder="山田 太郎"
                  maxLength={50}
                  value={form.contact_name ?? ''}
                  onChange={(e) => setForm((p) => ({ ...p, contact_name: e.target.value }))}
                />
              </div>
              <div className="grid gap-1.5">
                <Label>電話番号</Label>
                <Input
                  placeholder="03-0000-0000"
                  maxLength={20}
                  value={form.contact_phone ?? ''}
                  onChange={(e) => setForm((p) => ({ ...p, contact_phone: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label>メールアドレス</Label>
              <Input
                type="email"
                placeholder="contact@example.com"
                maxLength={254}
                value={form.contact_email ?? ''}
                onChange={(e) => setForm((p) => ({ ...p, contact_email: e.target.value }))}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>住所</Label>
              <Input
                placeholder="東京都〇〇区..."
                maxLength={200}
                value={form.address ?? ''}
                onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>ステータス</Label>
              <Select
                value={form.status ?? 'pending'}
                onValueChange={(v) => setForm((p) => ({ ...p, status: v as SponsorStatus }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.entries(SPONSOR_STATUS_LABELS) as [SponsorStatus, string][]).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>メモ</Label>
              <Textarea
                rows={3}
                placeholder="交渉状況・特記事項など..."
                maxLength={1000}
                value={form.notes ?? ''}
                onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              />
            </div>
          </div>
          {saveError && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mx-1">
              <AlertCircle size={14} className="shrink-0" />
              {saveError}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>キャンセル</Button>
            <Button
              onClick={handleSave}
              disabled={!form.company_name?.trim() || saving}
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

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="text-muted-foreground mt-0.5 shrink-0">{icon}</span>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm text-slate-700">{value}</p>
      </div>
    </div>
  );
}
