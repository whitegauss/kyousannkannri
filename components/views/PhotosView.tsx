'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import {
  ActivityPhoto,
  PhotoCategory,
  PHOTO_CATEGORY_LABELS,
  EventRow,
  UserRole,
  canWrite,
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
import { Camera, Plus, Search, X, ZoomIn, Tag, CalendarDays, Trash2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const CATEGORY_COLORS: Record<PhotoCategory, string> = {
  preparation: 'bg-amber-100 text-amber-700',
  event_day: 'bg-blue-100 text-blue-700',
  summary: 'bg-green-100 text-green-700',
  other: 'bg-slate-100 text-slate-600',
};

const MAX_TAGS = 10;
const MAX_TAG_LEN = 30;

/** https:// または http:// で始まる URL のみ許可 */
function isValidImageUrl(url: string): boolean {
  return /^https?:\/\/.+/.test(url.trim());
}

interface PhotosViewProps {
  event: EventRow;
  role: UserRole;
}

export default function PhotosView({ event, role }: PhotosViewProps) {
  const [photos, setPhotos] = useState<ActivityPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<PhotoCategory | 'all'>('all');
  const [lightbox, setLightbox] = useState<ActivityPhoto | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [newPhoto, setNewPhoto] = useState<Partial<ActivityPhoto>>({ category: 'event_day', tags: [] });
  const [tagInput, setTagInput] = useState('');

  const writable = canWrite(role);

  useEffect(() => { load(); }, [event.id]);

  async function load() {
    setLoading(true);
    setLoadError(null);
    const { data, error } = await supabase
      .from('activity_photos')
      .select('*')
      .eq('event_id', event.id)
      .order('taken_at', { ascending: false });
    if (error) {
      setLoadError('写真の読み込みに失敗しました。再読み込みしてください。');
    } else {
      setPhotos(data ?? []);
    }
    setLoading(false);
  }

  const filtered = photos.filter((p) => {
    const q = search.toLowerCase();
    const matchSearch =
      p.title.toLowerCase().includes(q) ||
      (p.description ?? '').toLowerCase().includes(q) ||
      (p.tags ?? []).some((t) => t.toLowerCase().includes(q));
    const matchCat = filterCategory === 'all' || p.category === filterCategory;
    return matchSearch && matchCat;
  });

  const countByCategory = (cat: PhotoCategory) => photos.filter((p) => p.category === cat).length;

  function addTag() {
    const trimmed = tagInput.trim().slice(0, MAX_TAG_LEN);
    if (!trimmed) return;
    const current = newPhoto.tags ?? [];
    if (current.length >= MAX_TAGS) return;
    if (current.includes(trimmed)) { setTagInput(''); return; }
    setNewPhoto((p) => ({ ...p, tags: [...(p.tags ?? []), trimmed] }));
    setTagInput('');
  }

  function removeTag(tag: string) {
    setNewPhoto((p) => ({ ...p, tags: (p.tags ?? []).filter((t) => t !== tag) }));
  }

  function handleOpenDialog() {
    setSaveError(null);
    setNewPhoto({ category: 'event_day', tags: [] });
    setTagInput('');
    setShowAddDialog(true);
  }

  async function handleAdd() {
    setSaveError(null);
    if (!newPhoto.title?.trim() || !newPhoto.url?.trim()) return;

    if (!isValidImageUrl(newPhoto.url)) {
      setSaveError('URLは https:// または http:// で始まる形式で入力してください。');
      return;
    }

    setSaving(true);
    const { data, error } = await supabase
      .from('activity_photos')
      .insert({
        event_id: event.id,
        title: newPhoto.title.trim(),
        description: newPhoto.description ?? '',
        url: newPhoto.url.trim(),
        category: newPhoto.category ?? 'other',
        taken_at: newPhoto.taken_at ?? new Date().toISOString().slice(0, 10),
        tags: (newPhoto.tags ?? []).slice(0, MAX_TAGS),
      })
      .select()
      .single();
    setSaving(false);
    if (error) {
      setSaveError('保存に失敗しました。もう一度お試しください。');
      return;
    }
    if (data) {
      setPhotos((prev) => [data, ...prev]);
      setShowAddDialog(false);
      setNewPhoto({ category: 'event_day', tags: [] });
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('この写真を削除しますか？')) return;
    const { error } = await supabase.from('activity_photos').delete().eq('id', id);
    if (!error) {
      setPhotos((prev) => prev.filter((p) => p.id !== id));
      if (lightbox?.id === id) setLightbox(null);
    }
  }

  return (
    <div className="p-6 space-y-5">
      {/* Category summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {(Object.entries(PHOTO_CATEGORY_LABELS) as [PhotoCategory, string][]).map(([cat, label]) => (
          <button
            key={cat}
            onClick={() => setFilterCategory(filterCategory === cat ? 'all' : cat)}
            className={cn(
              'rounded-xl border p-3 text-left transition-all duration-150',
              filterCategory === cat
                ? 'border-blue-300 bg-blue-50'
                : 'border-border bg-white hover:bg-slate-50'
            )}
          >
            <p className="text-lg font-bold text-slate-900">{countByCategory(cat)}</p>
            <p className={cn('text-xs font-medium mt-0.5 px-1.5 py-0.5 rounded-full inline-block', CATEGORY_COLORS[cat])}>
              {label}
            </p>
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="タイトル・タグで検索..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-white"
          />
        </div>
        <Select value={filterCategory} onValueChange={(v) => setFilterCategory(v as PhotoCategory | 'all')}>
          <SelectTrigger className="w-full sm:w-40 bg-white">
            <SelectValue placeholder="カテゴリー" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">すべて</SelectItem>
            {(Object.entries(PHOTO_CATEGORY_LABELS) as [PhotoCategory, string][]).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {writable && (
          <Button onClick={handleOpenDialog} className="bg-blue-600 hover:bg-blue-700 gap-2 shrink-0">
            <Plus size={16} />
            写真を追加
          </Button>
        )}
      </div>

      {loadError && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          <AlertCircle size={15} className="shrink-0" />
          {loadError}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        {loading ? '読み込み中...' : `${filtered.length}枚表示中（全${photos.length}枚）`}
      </p>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-xl bg-slate-100 aspect-[4/3] animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((photo) => (
            <div key={photo.id} className="group relative rounded-xl overflow-hidden border border-border bg-slate-100 aspect-[4/3]">
              <button
                className="w-full h-full"
                onClick={() => setLightbox(photo)}
              >
                <img
                  src={photo.url}
                  alt={photo.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-2 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-200">
                  <p className="text-white text-xs font-semibold leading-tight">{photo.title}</p>
                  <p className="text-white/70 text-[10px] mt-0.5">{photo.taken_at}</p>
                </div>
              </button>
              <div className="absolute top-2 left-2">
                <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-medium', CATEGORY_COLORS[photo.category])}>
                  {PHOTO_CATEGORY_LABELS[photo.category]}
                </span>
              </div>
              <div className="absolute top-2 right-2 flex items-center gap-1">
                <div className="w-7 h-7 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <ZoomIn size={13} className="text-white" />
                </div>
                {writable && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(photo.id); }}
                    className="w-7 h-7 rounded-full bg-red-500/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 size={11} className="text-white" />
                  </button>
                )}
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="col-span-full py-16 text-center text-muted-foreground">
              <Camera size={32} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">写真が見つかりません</p>
            </div>
          )}
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 md:p-8"
          onClick={() => setLightbox(null)}
        >
          <div
            className="bg-white rounded-2xl overflow-hidden max-w-3xl w-full max-h-[90vh] flex flex-col md:flex-row shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="md:w-2/3 bg-slate-900 shrink-0">
              <img
                src={lightbox.url}
                alt={lightbox.title}
                className="w-full h-64 md:h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="p-5 flex flex-col gap-3 overflow-y-auto md:w-1/3">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-base font-semibold text-slate-900">{lightbox.title}</h3>
                <button onClick={() => setLightbox(null)} className="text-muted-foreground hover:text-slate-700 shrink-0">
                  <X size={18} />
                </button>
              </div>
              <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium self-start', CATEGORY_COLORS[lightbox.category])}>
                {PHOTO_CATEGORY_LABELS[lightbox.category]}
              </span>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <CalendarDays size={12} />
                {lightbox.taken_at}
              </div>
              {lightbox.description && (
                <p className="text-sm text-slate-600 leading-relaxed">{lightbox.description}</p>
              )}
              {(lightbox.tags ?? []).length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Tag size={12} className="text-muted-foreground shrink-0" />
                  {(lightbox.tags ?? []).map((t) => (
                    <span key={t} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{t}</span>
                  ))}
                </div>
              )}
              {writable && (
                <button
                  onClick={() => handleDelete(lightbox.id)}
                  className="mt-auto flex items-center gap-1.5 text-xs text-red-500 hover:text-red-600"
                >
                  <Trash2 size={13} />
                  この写真を削除
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>写真を追加</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-1.5">
              <Label htmlFor="photo-title">タイトル *</Label>
              <Input
                id="photo-title"
                placeholder="写真のタイトル"
                maxLength={100}
                value={newPhoto.title ?? ''}
                onChange={(e) => setNewPhoto((p) => ({ ...p, title: e.target.value }))}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="photo-url">
                画像URL *{' '}
                <span className="text-xs text-muted-foreground">（https:// で始まるURL）</span>
              </Label>
              <Input
                id="photo-url"
                type="url"
                placeholder="https://..."
                maxLength={2048}
                value={newPhoto.url ?? ''}
                onChange={(e) => { setSaveError(null); setNewPhoto((p) => ({ ...p, url: e.target.value })); }}
              />
              {newPhoto.url && !isValidImageUrl(newPhoto.url) && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle size={11} />
                  https:// または http:// で始まるURLを入力してください
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>カテゴリー</Label>
                <Select
                  value={newPhoto.category ?? 'event_day'}
                  onValueChange={(v) => setNewPhoto((p) => ({ ...p, category: v as PhotoCategory }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.entries(PHOTO_CATEGORY_LABELS) as [PhotoCategory, string][]).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="photo-date">撮影日</Label>
                <Input
                  id="photo-date"
                  type="date"
                  value={newPhoto.taken_at ?? ''}
                  onChange={(e) => setNewPhoto((p) => ({ ...p, taken_at: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="photo-desc">説明</Label>
              <Textarea
                id="photo-desc"
                rows={2}
                maxLength={500}
                value={newPhoto.description ?? ''}
                onChange={(e) => setNewPhoto((p) => ({ ...p, description: e.target.value }))}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>
                タグ
                <span className="ml-1.5 text-xs text-muted-foreground">（最大{MAX_TAGS}個）</span>
              </Label>
              <div className="flex gap-2">
                <Input
                  placeholder="タグを入力してEnter"
                  maxLength={MAX_TAG_LEN}
                  value={tagInput}
                  disabled={(newPhoto.tags ?? []).length >= MAX_TAGS}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addTag}
                  disabled={(newPhoto.tags ?? []).length >= MAX_TAGS}
                >
                  追加
                </Button>
              </div>
              {(newPhoto.tags ?? []).length > 0 && (
                <div className="flex gap-1.5 flex-wrap mt-1">
                  {(newPhoto.tags ?? []).map((t) => (
                    <span key={t} className="flex items-center gap-1 text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                      {t}
                      <button onClick={() => removeTag(t)} aria-label={`タグ「${t}」を削除`}>
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
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
            <Button
              onClick={handleAdd}
              disabled={!newPhoto.title?.trim() || !newPhoto.url?.trim() || !isValidImageUrl(newPhoto.url ?? '') || saving}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {saving ? '追加中...' : '追加する'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
