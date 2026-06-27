'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import {
  ActivityPhoto,
  PhotoCategory,
  PHOTO_CATEGORY_LABELS,
  SPONSOR_STATUS_LABELS,
  EventRow,
  UserRole,
  Sponsor,
  SponsorshipItem,
} from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Wand2,
  Eye,
  CheckCircle2,
  Building2,
  CalendarDays,
  MapPin,
  ChevronRight,
  Printer,
  FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const STEP_LABELS = ['基本情報', '協賛企業選択', '写真選択', '文章編集', 'プレビュー'];

interface ReportViewProps {
  event: EventRow;
  role: UserRole;
}

export default function ReportView({ event, role }: ReportViewProps) {
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [items, setItems] = useState<SponsorshipItem[]>([]);
  const [photos, setPhotos] = useState<ActivityPhoto[]>([]);
  const [step, setStep] = useState(0);
  const [reportTitle, setReportTitle] = useState('');
  const [organizerName, setOrganizerName] = useState('');
  const [selectedSponsorIds, setSelectedSponsorIds] = useState<string[]>([]);
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<string[]>([]);
  const [sections, setSections] = useState({
    introduction: '',
    event_overview: '',
    event_plans: '',
    event_day_summary: '',
  });

  useEffect(() => {
    async function load() {
      const [sponsorRes, itemRes, photoRes] = await Promise.all([
        supabase.from('sponsors').select('*').eq('event_id', event.id).order('created_at', { ascending: false }),
        supabase.from('sponsorship_items').select('*').eq('event_id', event.id),
        supabase.from('activity_photos').select('*').eq('event_id', event.id).order('taken_at', { ascending: false }),
      ]);
      setSponsors(sponsorRes.data ?? []);
      setItems(itemRes.data ?? []);
      setPhotos(photoRes.data ?? []);
    }
    load();
  }, [event.id]);

  const selectedSponsors = sponsors.filter((s) => selectedSponsorIds.includes(s.id));
  const selectedPhotos = photos.filter((p) => selectedPhotoIds.includes(p.id));
  const confirmedItems = items.filter((i) => selectedSponsorIds.includes(i.sponsor_id));
  const totalMoney = confirmedItems
    .filter((i) => i.type === 'money' && i.amount)
    .reduce((s, i) => s + (i.amount ?? 0), 0);

  function toggleSponsor(id: string) {
    setSelectedSponsorIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function togglePhoto(id: string) {
    setSelectedPhotoIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function autoFill() {
    const names = selectedSponsors.map((sp) => `${sp.company_name}様`).join('、');
    setSections((s) => ({
      ...s,
      introduction: `この度は、${reportTitle || event.name || 'イベント'}の開催にあたり、多大なるご協賛を賜りましたことを心より御礼申し上げます。\n\n${names ? names + 'をはじめとする' : ''}${selectedSponsors.length}社の皆様のご支援のおかげをもちまして、本イベントを無事に開催することができました。本報告書にて、活動の成果とご協賛品の使用状況についてご報告申し上げます。`,
      event_overview: [
        event.name ? `【イベント名】${event.name}` : '',
        event.start_date ? `【開催日程】${event.start_date}${event.end_date ? ` 〜 ${event.end_date}` : ''}` : '',
        event.venue ? `【開催会場】${event.venue}` : '',
        organizerName ? `【主催団体】${organizerName}` : '',
        event.actual_visitors != null ? `【来場者数】${event.actual_visitors.toLocaleString()}名` : '',
      ].filter(Boolean).join('\n'),
    }));
  }

  const photosByCategory = (cat: PhotoCategory) => selectedPhotos.filter((p) => p.category === cat);

  return (
    <div className="p-6 space-y-5">
      {/* Print styles */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #a4-report, #a4-report * { visibility: visible; }
          #a4-report { position: fixed; top: 0; left: 0; width: 100%; }
          .a4-page {
            box-shadow: none !important;
            border-radius: 0 !important;
            margin: 0 !important;
            page-break-after: always;
            break-after: page;
          }
          .a4-page:last-child { page-break-after: avoid; break-after: avoid; }
        }
        @page { size: A4; margin: 0; }
      `}</style>

      {/* Stepper */}
      <div className="bg-white rounded-xl border border-border p-4">
        <div className="flex items-center gap-0">
          {STEP_LABELS.map((label, i) => (
            <div key={i} className="flex items-center flex-1 last:flex-none">
              <button onClick={() => i <= step && setStep(i)} className="flex flex-col items-center gap-1">
                <div className={cn(
                  'w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors',
                  i < step ? 'bg-green-500 text-white' :
                  i === step ? 'bg-blue-600 text-white' :
                  'bg-slate-100 text-slate-400'
                )}>
                  {i < step ? <CheckCircle2 size={14} /> : i + 1}
                </div>
                <span className={cn(
                  'text-[10px] font-medium hidden sm:block',
                  i === step ? 'text-blue-600' : i < step ? 'text-green-600' : 'text-slate-400'
                )}>
                  {label}
                </span>
              </button>
              {i < STEP_LABELS.length - 1 && (
                <div className={cn('flex-1 h-0.5 mx-2', i < step ? 'bg-green-400' : 'bg-slate-200')} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step 0: Basic info */}
      {step === 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm">基本情報の入力</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-1.5">
              <Label>報告書タイトル</Label>
              <Input
                placeholder="例: 第〇回〇〇祭 協賛報告書"
                maxLength={100}
                value={reportTitle}
                onChange={(e) => setReportTitle(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>主催団体名</Label>
              <Input
                placeholder="例: 〇〇実行委員会"
                maxLength={100}
                value={organizerName}
                onChange={(e) => setOrganizerName(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>開催日（開始）</Label>
                <Input
                  type="date"
                  value={event.start_date ?? ''}
                  readOnly
                  className="bg-slate-50 text-muted-foreground"
                />
                <p className="text-[11px] text-muted-foreground">※ イベント情報から自動取得</p>
              </div>
              <div className="grid gap-1.5">
                <Label>開催日（終了）</Label>
                <Input
                  type="date"
                  value={event.end_date ?? ''}
                  readOnly
                  className="bg-slate-50 text-muted-foreground"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={() => setStep(1)} className="gap-2 bg-blue-600 hover:bg-blue-700">
                次へ <ChevronRight size={16} />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 1: Sponsor selection */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">報告書に含める協賛企業を選択</CardTitle>
              <span className="text-xs text-muted-foreground">{selectedSponsorIds.length}社選択中</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {sponsors.length === 0 ? (
              <div className="text-center py-10">
                <Building2 size={28} className="mx-auto text-slate-200 mb-2" />
                <p className="text-sm text-muted-foreground">協賛企業がまだ登録されていません</p>
                <p className="text-xs text-slate-400 mt-1">「協賛企業」メニューから企業を追加してください</p>
              </div>
            ) : (
              sponsors.map((s) => (
                <label key={s.id} className={cn(
                  'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                  selectedSponsorIds.includes(s.id)
                    ? 'border-blue-200 bg-blue-50'
                    : 'border-border bg-white hover:bg-slate-50'
                )}>
                  <Checkbox
                    checked={selectedSponsorIds.includes(s.id)}
                    onCheckedChange={() => toggleSponsor(s.id)}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800">{s.company_name}</p>
                    <p className="text-xs text-muted-foreground">{s.contact_name}</p>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {SPONSOR_STATUS_LABELS[s.status]}
                  </span>
                </label>
              ))
            )}
            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={() => setStep(0)}>戻る</Button>
              <Button onClick={() => setStep(2)} className="gap-2 bg-blue-600 hover:bg-blue-700">
                次へ <ChevronRight size={16} />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Photo selection */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">報告書に含める写真を選択</CardTitle>
              <span className="text-xs text-muted-foreground">{selectedPhotoIds.length}枚選択中</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {photos.length === 0 ? (
              <div className="text-center py-10">
                <FileText size={28} className="mx-auto text-slate-200 mb-2" />
                <p className="text-sm text-muted-foreground">写真がまだ登録されていません</p>
                <p className="text-xs text-slate-400 mt-1">「活動写真」メニューから写真を追加してください</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {photos.map((photo) => (
                  <button
                    key={photo.id}
                    onClick={() => togglePhoto(photo.id)}
                    className={cn(
                      'relative rounded-lg overflow-hidden aspect-[4/3] border-2 transition-all duration-150',
                      selectedPhotoIds.includes(photo.id)
                        ? 'border-blue-500 ring-2 ring-blue-200'
                        : 'border-transparent'
                    )}
                  >
                    <img src={photo.url} alt={photo.title} className="w-full h-full object-cover" />
                    <div className={cn(
                      'absolute inset-0 flex items-center justify-center transition-opacity',
                      selectedPhotoIds.includes(photo.id) ? 'bg-blue-600/20' : 'bg-transparent'
                    )}>
                      {selectedPhotoIds.includes(photo.id) && (
                        <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center">
                          <CheckCircle2 size={16} className="text-white" />
                        </div>
                      )}
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 p-2">
                      <p className="text-white text-[10px] font-medium truncate">{photo.title}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={() => setStep(1)}>戻る</Button>
              <Button onClick={() => setStep(3)} className="gap-2 bg-blue-600 hover:bg-blue-700">
                次へ <ChevronRight size={16} />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Text editing */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">報告書の文章を編集</CardTitle>
              <Button variant="outline" size="sm" onClick={autoFill} className="gap-1.5 text-xs">
                <Wand2 size={13} />
                自動入力
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {[
              { key: 'introduction' as const, label: '1. はじめに', placeholder: '挨拶・感謝の言葉を入力してください...' },
              { key: 'event_overview' as const, label: '2. イベントの概要', placeholder: 'イベントの概要を入力してください...' },
              { key: 'event_plans' as const, label: '3. 開催企画について', placeholder: '各企画の説明を入力してください...' },
              { key: 'event_day_summary' as const, label: '4. 当日の様子', placeholder: '当日の様子・成果を入力してください...' },
            ].map(({ key, label, placeholder }) => (
              <div key={key} className="grid gap-1.5">
                <Label className="text-sm font-semibold">{label}</Label>
                <Textarea
                  rows={5}
                  placeholder={placeholder}
                  maxLength={5000}
                  value={sections[key]}
                  onChange={(e) => setSections((s) => ({ ...s, [key]: e.target.value }))}
                  className="resize-none text-sm leading-relaxed"
                />
                <p className="text-right text-[10px] text-muted-foreground">{sections[key].length}/5000</p>
              </div>
            ))}
            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={() => setStep(2)}>戻る</Button>
              <Button onClick={() => setStep(4)} className="gap-2 bg-blue-600 hover:bg-blue-700">
                プレビュー <Eye size={16} />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: A4 Preview */}
      {step === 4 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">A4サイズでプレビュー中 — 各ページが1枚のA4に対応します</p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(3)}>編集に戻る</Button>
              <Button className="gap-2 bg-blue-600 hover:bg-blue-700" onClick={() => window.print()}>
                <Printer size={16} />
                印刷 / PDF出力
              </Button>
            </div>
          </div>

          <div id="a4-report" className="space-y-6 pb-8">
            {/* Page 1: Cover + Introduction */}
            <A4Page pageNum={1}>
              <div className="text-center mb-10 pb-8 border-b-2 border-slate-200">
                {organizerName && (
                  <p className="text-xs text-slate-400 mb-4 tracking-widest uppercase">{organizerName}</p>
                )}
                <h1 className="text-3xl font-bold text-slate-900 mb-5 leading-tight">
                  {reportTitle || event.name || '協賛報告書'}
                </h1>
                <div className="flex items-center justify-center gap-8 text-sm text-slate-500">
                  {(event.start_date || event.end_date) && (
                    <span className="flex items-center gap-1.5">
                      <CalendarDays size={14} />
                      {event.start_date}{event.end_date && ` 〜 ${event.end_date}`}
                    </span>
                  )}
                  {event.venue && (
                    <span className="flex items-center gap-1.5">
                      <MapPin size={14} />
                      {event.venue}
                    </span>
                  )}
                </div>
                {(selectedSponsors.length > 0 || totalMoney > 0 || event.actual_visitors != null) && (
                  <div className="mt-8 grid grid-cols-3 gap-4">
                    {event.actual_visitors != null && (
                      <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                        <p className="text-2xl font-bold text-blue-700">{event.actual_visitors.toLocaleString()}<span className="text-base font-normal ml-0.5">名</span></p>
                        <p className="text-xs text-muted-foreground mt-1">来場者数</p>
                      </div>
                    )}
                    {selectedSponsors.length > 0 && (
                      <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                        <p className="text-2xl font-bold text-blue-700">{selectedSponsors.length}<span className="text-base font-normal ml-0.5">社</span></p>
                        <p className="text-xs text-muted-foreground mt-1">協賛企業数</p>
                      </div>
                    )}
                    {totalMoney > 0 && (
                      <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                        <p className="text-xl font-bold text-blue-700">¥{totalMoney.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground mt-1">協賛金総額</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <ReportSection title="1. はじめに" content={sections.introduction} />
            </A4Page>

            {/* Page 2: Event overview + Plans */}
            <A4Page pageNum={2}>
              <ReportSection title="2. イベントの概要" content={sections.event_overview} />
              <div className="mt-8">
                <ReportSection title="3. 開催企画について" content={sections.event_plans}>
                  {selectedSponsors.length > 0 && (
                    <div className="mt-5">
                      <p className="text-sm font-semibold text-slate-700 mb-3">ご協賛いただいた企業様一覧</p>
                      <table className="w-full text-sm border-collapse">
                        <thead>
                          <tr className="bg-slate-800 text-white">
                            <th className="text-left px-4 py-2.5 text-xs font-semibold rounded-tl-lg">企業名</th>
                            <th className="text-left px-4 py-2.5 text-xs font-semibold">協賛内容</th>
                            <th className="text-right px-4 py-2.5 text-xs font-semibold rounded-tr-lg">金額</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedSponsors.map((s, idx) => {
                            const sItems = confirmedItems.filter((i) => i.sponsor_id === s.id);
                            const money = sItems.filter((i) => i.type === 'money').reduce((sum, i) => sum + (i.amount ?? 0), 0);
                            const goods = sItems.filter((i) => i.type !== 'money').map((i) => i.name).join('、');
                            return (
                              <tr key={s.id} className={cn('border-b border-slate-100', idx % 2 === 1 ? 'bg-slate-50' : 'bg-white')}>
                                <td className="px-4 py-2.5 font-medium text-slate-800 text-xs">{s.company_name}</td>
                                <td className="px-4 py-2.5 text-slate-600 text-xs">{goods || '協賛金のみ'}</td>
                                <td className="px-4 py-2.5 text-right font-semibold text-slate-700 text-xs">{money > 0 ? `¥${money.toLocaleString()}` : '—'}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </ReportSection>
              </div>
            </A4Page>

            {/* Page 3: Event day + Photos */}
            <A4Page pageNum={3}>
              <ReportSection title="4. 当日の様子" content={sections.event_day_summary}>
                {(['preparation', 'event_day', 'summary'] as PhotoCategory[]).map((cat) => {
                  const catPhotos = photosByCategory(cat);
                  if (catPhotos.length === 0) return null;
                  return (
                    <div key={cat} className="mt-5">
                      <p className="text-xs font-semibold text-slate-500 mb-2 tracking-wider uppercase">
                        {PHOTO_CATEGORY_LABELS[cat]}
                      </p>
                      <div className="grid grid-cols-3 gap-2">
                        {catPhotos.slice(0, 6).map((photo) => (
                          <div key={photo.id} className="rounded-lg overflow-hidden aspect-[4/3] bg-slate-100">
                            <img src={photo.url} alt={photo.title} className="w-full h-full object-cover" />
                          </div>
                        ))}
                      </div>
                      {catPhotos.length > 6 && (
                        <p className="text-xs text-muted-foreground mt-1">他 {catPhotos.length - 6}枚</p>
                      )}
                    </div>
                  );
                })}
              </ReportSection>
              <div className="mt-auto pt-10 border-t border-slate-200 text-center space-y-1">
                <p className="text-sm text-slate-600">
                  以上をもちまして、{reportTitle || event.name || '協賛報告書'}とさせていただきます。
                </p>
                <p className="text-sm text-slate-600">ご協賛いただきました皆様に、心より感謝申し上げます。</p>
                {organizerName && (
                  <p className="text-xs text-muted-foreground mt-3">{organizerName}</p>
                )}
              </div>
            </A4Page>
          </div>
        </div>
      )}
    </div>
  );
}

function A4Page({ pageNum, children }: { pageNum: number; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center">
      <div
        className="a4-page bg-white shadow-[0_4px_24px_rgba(0,0,0,0.10)] w-full max-w-[794px] flex flex-col"
        style={{ minHeight: '1123px', padding: '72px 64px' }}
      >
        {children}
        <div className="mt-auto pt-6 flex items-center justify-between text-[10px] text-slate-300 border-t border-slate-100">
          <span>{new Date().getFullYear()}</span>
          <span>{pageNum}</span>
        </div>
      </div>
    </div>
  );
}

function ReportSection({
  title,
  content,
  children,
}: {
  title: string;
  content: string;
  children?: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-base font-bold text-slate-900 pb-2 border-b-2 border-blue-600">{title}</h2>
      {content ? (
        <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{content}</p>
      ) : (
        <p className="text-sm text-slate-300 italic">（未入力）</p>
      )}
      {children}
    </section>
  );
}
