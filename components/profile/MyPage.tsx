'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import {
  EventRow,
  EventMember,
  Profile,
  UserRole,
  USER_ROLE_LABELS,
  USER_ROLE_COLORS,
  EVENT_STATUS_LABELS,
  canManageMembers,
  canDeleteEvent,
} from '@/lib/types';
import { User } from '@supabase/supabase-js';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  ArrowLeft,
  CalendarDays,
  MapPin,
  Users,
  Building2,
  UserPlus,
  Trash2,
  Loader2,
  LogOut,
  Edit2,
  Save,
  X,
  User as UserIcon,
  Crown,
  Shield,
  Pen,
  Eye,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface MyPageProps {
  user: User;
  onBack: () => void;
}

const ROLE_ICONS: Record<UserRole, React.ReactNode> = {
  owner: <Crown size={13} className="text-blue-600" />,
  admin: <Shield size={13} className="text-violet-600" />,
  editor: <Pen size={13} className="text-green-600" />,
  viewer: <Eye size={13} className="text-slate-500" />,
};

export default function MyPage({ user, onBack }: MyPageProps) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [events, setEvents] = useState<(EventRow & { role: UserRole; memberCount: number })[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingProfile, setEditingProfile] = useState(false);
  const [fullName, setFullName] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  // Member management
  const [selectedEvent, setSelectedEvent] = useState<(EventRow & { role: UserRole }) | null>(null);
  const [members, setMembers] = useState<(EventMember & { profile?: Profile })[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>('editor');
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const [profileRes, membershipsRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
      supabase.from('event_members').select('role, events(*)').eq('user_id', user.id),
    ]);

    if (profileRes.data) {
      setProfile(profileRes.data);
      setFullName(profileRes.data.full_name || '');
    }

    if (membershipsRes.data) {
      const eventList = membershipsRes.data
        .filter((r) => r.events)
        .map((r) => ({
          ...(r.events as unknown as EventRow),
          role: r.role as UserRole,
          memberCount: 0,
        }));
      setEvents(eventList);
    }
    setLoading(false);
  }

  async function saveProfile() {
    setSavingProfile(true);
    await supabase
      .from('profiles')
      .update({ full_name: fullName, updated_at: new Date().toISOString() })
      .eq('id', user.id);
    setProfile((p) => p ? { ...p, full_name: fullName } : p);
    setEditingProfile(false);
    setSavingProfile(false);
  }

  async function openMembers(event: EventRow & { role: UserRole }) {
    setSelectedEvent(event);
    setMembersLoading(true);
    const { data } = await supabase
      .from('event_members')
      .select('*, profiles(*)')
      .eq('event_id', event.id)
      .order('created_at');
    if (data) setMembers(data as (EventMember & { profile?: Profile })[]);
    setMembersLoading(false);
  }

  async function inviteMember() {
    if (!selectedEvent || !inviteEmail.trim()) return;
    setInviting(true);
    setInviteError('');

    // Look up user by email
    const { data: profileData } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .eq('email', inviteEmail.trim().toLowerCase())
      .maybeSingle();

    if (!profileData) {
      setInviteError('そのメールアドレスのユーザーが見つかりません');
      setInviting(false);
      return;
    }

    const { error } = await supabase
      .from('event_members')
      .insert({
        event_id: selectedEvent.id,
        user_id: profileData.id,
        role: inviteRole,
        invited_by: user.id,
      });

    if (error) {
      setInviteError(error.code === '23505' ? 'そのユーザーはすでにメンバーです' : error.message);
    } else {
      setInviteEmail('');
      await openMembers(selectedEvent);
    }
    setInviting(false);
  }

  async function updateRole(memberId: string, newRole: UserRole) {
    await supabase.from('event_members').update({ role: newRole }).eq('id', memberId);
    setMembers((prev) => prev.map((m) => m.id === memberId ? { ...m, role: newRole } : m));
  }

  async function removeMember(memberId: string, targetUserId: string) {
    if (targetUserId === user.id) return;
    await supabase.from('event_members').delete().eq('id', memberId);
    setMembers((prev) => prev.filter((m) => m.id !== memberId));
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
  }

  const avatarUrl = profile?.avatar_url || user.user_metadata?.avatar_url || user.user_metadata?.picture;
  const displayName = profile?.full_name || user.user_metadata?.full_name || user.user_metadata?.name || user.email || '';

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-border px-6 py-4 flex items-center gap-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft size={16} />
          <span>イベント一覧</span>
        </button>
        <div className="flex-1" />
        <button
          onClick={handleSignOut}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors text-sm text-slate-500"
        >
          <LogOut size={14} />
          <span className="hidden sm:block">ログアウト</span>
        </button>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-10 space-y-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={24} className="animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Profile card */}
            <div className="bg-white rounded-2xl border border-border p-6">
              <div className="flex items-start gap-5">
                <div className="relative">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="" className="w-16 h-16 rounded-full object-cover ring-2 ring-slate-100" />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center ring-2 ring-slate-100">
                      <UserIcon size={28} className="text-blue-600" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  {editingProfile ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="h-8 text-sm"
                        placeholder="表示名"
                      />
                      <Button size="sm" onClick={saveProfile} disabled={savingProfile} className="gap-1 h-8 bg-blue-600 hover:bg-blue-700">
                        {savingProfile ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                        保存
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingProfile(false)} className="h-8 w-8 p-0">
                        <X size={14} />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-bold text-slate-900 leading-tight">{displayName}</h2>
                      <button
                        onClick={() => setEditingProfile(true)}
                        className="text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        <Edit2 size={13} />
                      </button>
                    </div>
                  )}
                  <p className="text-sm text-muted-foreground mt-0.5">{user.email}</p>
                  <p className="text-xs text-slate-400 mt-1">
                    登録日: {new Date(user.created_at).toLocaleDateString('ja-JP')}
                  </p>
                </div>
              </div>
            </div>

            {/* Events */}
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-3">参加中のイベント（{events.length}件）</h3>
              <div className="space-y-3">
                {events.length === 0 ? (
                  <div className="bg-white rounded-xl border border-border p-8 text-center">
                    <CalendarDays size={24} className="mx-auto text-slate-200 mb-2" />
                    <p className="text-sm text-muted-foreground">参加中のイベントがありません</p>
                  </div>
                ) : (
                  events.map((event) => (
                    <div key={event.id} className="bg-white rounded-xl border border-border p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                          <CalendarDays size={16} className="text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-slate-800 text-sm">{event.name}</p>
                            <span className={cn('text-xs px-2 py-0.5 rounded-full border font-medium flex items-center gap-1', USER_ROLE_COLORS[event.role])}>
                              {ROLE_ICONS[event.role]}
                              {USER_ROLE_LABELS[event.role]}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5 flex-wrap">
                            {event.organizer && <span>{event.organizer}</span>}
                            {event.venue && <span className="flex items-center gap-0.5"><MapPin size={10} />{event.venue}</span>}
                            <span className="text-slate-400">{EVENT_STATUS_LABELS[event.status]}</span>
                          </div>
                        </div>
                        {canManageMembers(event.role) && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openMembers(event)}
                            className="gap-1.5 text-xs shrink-0"
                          >
                            <Users size={13} />
                            メンバー管理
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Role guide */}
            <div className="bg-white rounded-xl border border-border p-5">
              <h4 className="text-sm font-semibold text-slate-700 mb-3">権限について</h4>
              <div className="space-y-2">
                {([
                  { role: 'owner' as UserRole, desc: 'イベント削除・メンバー管理・全データ編集' },
                  { role: 'admin' as UserRole, desc: 'メンバー管理・全データ編集' },
                  { role: 'editor' as UserRole, desc: 'データ追加・編集（メンバー管理不可）' },
                  { role: 'viewer' as UserRole, desc: '閲覧のみ（データ変更不可）' },
                ]).map(({ role, desc }) => (
                  <div key={role} className="flex items-center gap-3">
                    <span className={cn('text-xs px-2 py-0.5 rounded-full border font-medium flex items-center gap-1 shrink-0', USER_ROLE_COLORS[role])}>
                      {ROLE_ICONS[role]}
                      {USER_ROLE_LABELS[role]}
                    </span>
                    <span className="text-xs text-muted-foreground">{desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </main>

      {/* Member management dialog */}
      <Dialog open={selectedEvent !== null} onOpenChange={(o) => !o && setSelectedEvent(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-sm">
              メンバー管理 — {selectedEvent?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Invite */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-slate-600">メンバーを追加（メールアドレスで検索）</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="example@email.com"
                  value={inviteEmail}
                  onChange={(e) => { setInviteEmail(e.target.value); setInviteError(''); }}
                  className="text-sm"
                />
                <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as UserRole)}>
                  <SelectTrigger className="w-28 shrink-0"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">{USER_ROLE_LABELS.admin}</SelectItem>
                    <SelectItem value="editor">{USER_ROLE_LABELS.editor}</SelectItem>
                    <SelectItem value="viewer">{USER_ROLE_LABELS.viewer}</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  onClick={inviteMember}
                  disabled={!inviteEmail.trim() || inviting}
                  className="gap-1.5 bg-blue-600 hover:bg-blue-700 shrink-0"
                >
                  {inviting ? <Loader2 size={13} className="animate-spin" /> : <UserPlus size={13} />}
                  追加
                </Button>
              </div>
              {inviteError && <p className="text-xs text-red-500">{inviteError}</p>}
            </div>

            {/* Member list */}
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {membersLoading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 size={18} className="animate-spin text-muted-foreground" />
                </div>
              ) : (
                members.map((member) => {
                  const isMe = member.user_id === user.id;
                  const isOwner = member.role === 'owner';
                  return (
                    <div key={member.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-border">
                      {member.profile?.avatar_url ? (
                        <img src={member.profile.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover shrink-0" />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                          <UserIcon size={13} className="text-slate-500" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-slate-800 truncate">
                          {member.profile?.full_name || member.profile?.email || '—'}
                          {isMe && <span className="text-muted-foreground ml-1">（自分）</span>}
                        </p>
                        <p className="text-[10px] text-muted-foreground truncate">{member.profile?.email}</p>
                      </div>
                      {isOwner || isMe ? (
                        <span className={cn('text-xs px-2 py-0.5 rounded-full border font-medium shrink-0', USER_ROLE_COLORS[member.role])}>
                          {USER_ROLE_LABELS[member.role]}
                        </span>
                      ) : (
                        <Select
                          value={member.role}
                          onValueChange={(v) => updateRole(member.id, v as UserRole)}
                        >
                          <SelectTrigger className="w-24 h-6 text-xs shrink-0">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">{USER_ROLE_LABELS.admin}</SelectItem>
                            <SelectItem value="editor">{USER_ROLE_LABELS.editor}</SelectItem>
                            <SelectItem value="viewer">{USER_ROLE_LABELS.viewer}</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                      {!isOwner && !isMe && (
                        <button
                          onClick={() => removeMember(member.id, member.user_id)}
                          className="text-slate-300 hover:text-red-500 transition-colors shrink-0"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedEvent(null)}>閉じる</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
