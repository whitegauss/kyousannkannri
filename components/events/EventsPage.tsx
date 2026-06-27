'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { EventRow, UserRole, USER_ROLE_LABELS, USER_ROLE_COLORS, EVENT_STATUS_LABELS } from '@/lib/types';
import { User } from '@supabase/supabase-js';
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
  Zap,
  Plus,
  CalendarDays,
  MapPin,
  Users,
  ChevronRight,
  LogOut,
  Loader2,
  User as UserIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface EventsPageProps {
  user: User;
  onSelectEvent: (event: EventRow, role: UserRole) => void;
  onProfile: () => void;
}

export default function EventsPage({ user, onSelectEvent, onProfile }: EventsPageProps) {
  const [events, setEvents] = useState<(EventRow & { role: UserRole })[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    name: '',
    organizer: '',
    venue: '',
    start_date: '',
    end_date: '',
    description: '',
    status: 'planning' as 'planning' | 'active' | 'completed',
  });

  useEffect(() => {
    loadEvents();
  }, []);

  async function loadEvents() {
    setLoading(true);
    const { data, error } = await supabase
      .from('event_members')
      .select('role, events(*)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      const list = data
        .filter((row) => row.events)
        .map((row) => ({
          ...(row.events as unknown as EventRow),
          role: row.role as UserRole,
        }));
      setEvents(list);
    }
    setLoading(false);
  }

  async function handleCreate() {
    if (!form.name.trim()) return;
    setCreating(true);
    const { data, error } = await supabase
      .from('events')
      .insert({
        name: form.name.trim(),
        organizer: form.organizer.trim(),
        venue: form.venue.trim(),
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        description: form.description.trim(),
        status: form.status,
        created_by: user.id,
      })
      .select()
      .single();

    if (!error && data) {
      setShowCreate(false);
      setForm({ name: '', organizer: '', venue: '', start_date: '', end_date: '', description: '', status: 'planning' });
      await loadEvents();
    }
    setCreating(false);
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top bar */}
      <header className="bg-white border-b border-border px-6 py-4 flex items-center gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center">
            <Zap size={16} className="text-white" />
          </div>
          <span className="font-bold text-slate-900">FastSponsor</span>
        </div>
        <div className="flex-1" />
        <button
          onClick={onProfile}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors text-sm text-slate-700"
        >
          {(user.user_metadata?.avatar_url || user.user_metadata?.picture) ? (
            <img
              src={user.user_metadata.avatar_url || user.user_metadata.picture}
              alt=""
              className="w-6 h-6 rounded-full object-cover"
            />
          ) : (
            <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
              <UserIcon size={12} className="text-blue-600" />
            </div>
          )}
          <span className="hidden sm:block">{user.user_metadata?.full_name || user.user_metadata?.name || user.email}</span>
        </button>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors text-sm text-slate-500"
        >
          <LogOut size={14} />
          <span className="hidden sm:block">ログアウト</span>
        </button>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">イベント一覧</h1>
            <p className="text-sm text-muted-foreground mt-0.5">管理するイベントを選択してください</p>
          </div>
          <Button onClick={() => setShowCreate(true)} className="gap-2 bg-blue-600 hover:bg-blue-700">
            <Plus size={16} />
            新規作成
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={24} className="animate-spin text-muted-foreground" />
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <CalendarDays size={28} className="text-slate-300" />
            </div>
            <p className="text-slate-700 font-medium">イベントがありません</p>
            <p className="text-sm text-muted-foreground mt-1">新規作成から最初のイベントを追加しましょう</p>
            <Button onClick={() => setShowCreate(true)} className="mt-4 gap-2 bg-blue-600 hover:bg-blue-700">
              <Plus size={16} />
              イベントを作成
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {events.map((event) => (
              <button
                key={event.id}
                onClick={() => onSelectEvent(event, event.role)}
                className="w-full text-left bg-white rounded-xl border border-border p-5 hover:shadow-md hover:border-slate-300 transition-all duration-150 group"
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                    <CalendarDays size={18} className="text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="font-semibold text-slate-900 text-base leading-tight">{event.name}</h3>
                      <span className={cn('text-xs px-2 py-0.5 rounded-full border font-medium', USER_ROLE_COLORS[event.role])}>
                        {USER_ROLE_LABELS[event.role]}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                        {EVENT_STATUS_LABELS[event.status]}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                      {event.venue && (
                        <span className="flex items-center gap-1">
                          <MapPin size={11} />
                          {event.venue}
                        </span>
                      )}
                      {(event.start_date || event.end_date) && (
                        <span className="flex items-center gap-1">
                          <CalendarDays size={11} />
                          {event.start_date}{event.end_date && event.end_date !== event.start_date && ` 〜 ${event.end_date}`}
                        </span>
                      )}
                      {event.organizer && (
                        <span className="flex items-center gap-1">
                          <Users size={11} />
                          {event.organizer}
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-slate-300 group-hover:text-slate-500 transition-colors shrink-0 mt-1" />
                </div>
              </button>
            ))}
          </div>
        )}
      </main>

      {/* Create dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>新規イベント作成</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-1.5">
              <Label htmlFor="ev-name">イベント名 *</Label>
              <Input
                id="ev-name"
                placeholder="例: 第〇回〇〇祭"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="ev-organizer">主催団体名</Label>
              <Input
                id="ev-organizer"
                placeholder="例: 〇〇実行委員会"
                value={form.organizer}
                onChange={(e) => setForm((p) => ({ ...p, organizer: e.target.value }))}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="ev-venue">開催会場</Label>
              <Input
                id="ev-venue"
                placeholder="例: 〇〇大学キャンパス"
                value={form.venue}
                onChange={(e) => setForm((p) => ({ ...p, venue: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="ev-start">開催日（開始）</Label>
                <Input
                  id="ev-start"
                  type="date"
                  value={form.start_date}
                  onChange={(e) => setForm((p) => ({ ...p, start_date: e.target.value }))}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="ev-end">開催日（終了）</Label>
                <Input
                  id="ev-end"
                  type="date"
                  value={form.end_date}
                  onChange={(e) => setForm((p) => ({ ...p, end_date: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label>ステータス</Label>
              <Select
                value={form.status}
                onValueChange={(v) => setForm((p) => ({ ...p, status: v as typeof form.status }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="planning">計画中</SelectItem>
                  <SelectItem value="active">開催中</SelectItem>
                  <SelectItem value="completed">完了</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="ev-desc">説明</Label>
              <Textarea
                id="ev-desc"
                placeholder="イベントの説明..."
                rows={2}
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>キャンセル</Button>
            <Button
              onClick={handleCreate}
              disabled={!form.name.trim() || creating}
              className="bg-blue-600 hover:bg-blue-700 gap-2"
            >
              {creating && <Loader2 size={14} className="animate-spin" />}
              作成する
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
