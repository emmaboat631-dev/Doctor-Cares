import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Camera, Image as ImageIcon, Mic, Paperclip, Phone, Play, Pause, Send, Video, X } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { Alert } from '@/components/ui/Alert';
import { useAuth } from '@/contexts/AuthContext';
import { useAsync } from '@/hooks/useAsync';
import { useRealtimeMessages } from '@/hooks/useRealtimeMessages';
import { getConversation, getOtherLastRead, listMessages, markConversationRead, sendMessage } from '@/lib/api/chat';
import { uploadChatAttachment } from '@/lib/api/storage';
import { cn } from '@/lib/cn';
import { fmtDate, fmtTime } from '@/lib/format';
import { ImageViewer } from '@/components/chat/ImageViewer';
import type { Message } from '@/types';

interface OutgoingMessage extends Message {
  _pending?: boolean;
  _failed?: boolean;
  _tmpId?: string;
}

// Heuristics for what an attachment_url is — extension-based so we don't need a schema change.
const isImageUrl = (u?: string | null) => !!u && /\.(png|jpe?g|gif|webp|heic|avif)(\?|$)/i.test(u);
const isVoiceUrl = (u?: string | null) => !!u && /\.(webm|m4a|mp3|ogg|opus|wav)(\?|$)/i.test(u);

function groupByDay(msgs: OutgoingMessage[]) {
  const groups = new Map<string, OutgoingMessage[]>();
  for (const m of msgs) {
    const d = new Date(m.created_at);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(m);
  }
  const today = new Date();
  const yesterday = new Date(); yesterday.setDate(today.getDate() - 1);
  const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  return Array.from(groups.entries()).map(([dayKey, items]) => {
    const d = new Date(items[0].created_at);
    const label =
      sameDay(d, today)     ? 'Today'
      : sameDay(d, yesterday) ? 'Yesterday'
      : fmtDate(items[0].created_at, { weekday: 'long', month: 'short', day: 'numeric' });
    return { dayKey, label, items };
  });
}

export function ChatDetailPage() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const myId = user?.id ?? '';

  const conv = useAsync(async () => (conversationId && myId ? getConversation(conversationId, myId) : null),
    [conversationId, myId]);
  const initial = useAsync(async () => (conversationId ? listMessages(conversationId) : []),
    [conversationId]);

  // Presence display disabled — always show "Online" in the chat header. The
  // heartbeat + last_seen_at column are still populated in the background
  // (see AuthContext + lib/presence) so the feature can be re-enabled later
  // by re-adding the interval + `lastSeenAt` state and passing it to
  // ChatHeader, without any migration or backfill.
  const otherId = conv.data?.counterparty?.id ?? null;

  const [messages, setMessages] = useState<OutgoingMessage[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [otherLastRead, setOtherLastRead] = useState<string | null>(null);
  const [showAttach, setShowAttach] = useState(false);

  // Voice recording state
  const [recording, setRecording] = useState(false);
  const recMimeRef = useRef<{ mime: string; ext: string }>({ mime: 'audio/webm', ext: 'webm' });
  const [recSecs, setRecSecs] = useState(0);
  const recRef = useRef<{ mr: MediaRecorder; chunks: Blob[]; stream: MediaStream; startedAt: number } | null>(null);
  const recTimer = useRef<number | null>(null);

  const scrollerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { if (initial.data) setMessages(initial.data); }, [initial.data]);

  // Poll the other participant's last_read_at periodically so seen receipts update.
  useEffect(() => {
    if (!conversationId || !myId) return;
    let cancelled = false;
    const load = async () => {
      try {
        const t = await getOtherLastRead(conversationId, myId);
        if (!cancelled) setOtherLastRead(t);
      } catch { /* ignore */ }
    };
    load();
    const iv = setInterval(load, 6000);
    return () => { cancelled = true; clearInterval(iv); };
  }, [conversationId, myId, messages.length]);

  useRealtimeMessages(conversationId, (incoming) => {
    setMessages((prev) => {
      if (prev.some((m) => m.id === incoming.id && !m._tmpId)) return prev;
      const optIdx = prev.findIndex((m) => m._tmpId && m.body === incoming.body && m.sender_id === incoming.sender_id);
      if (optIdx >= 0) {
        const next = [...prev];
        next[optIdx] = incoming;
        return next;
      }
      return [...prev, incoming];
    });
  });

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages.length, initial.loading]);

  useEffect(() => {
    if (!conversationId || !myId) return;
    markConversationRead(conversationId, myId).catch(() => {});
  }, [conversationId, myId, messages.length]);

  const send = async (opts?: { body?: string; attachmentUrl?: string | null }) => {
    const body = (opts?.body ?? text).trim();
    if (!body && !opts?.attachmentUrl) return;
    if (!conversationId || !myId) return;
    const tmpId = `tmp-${Date.now()}`;
    const optimistic: OutgoingMessage = {
      id: tmpId,
      conversation_id: conversationId,
      sender_id: myId,
      body: body || (opts?.attachmentUrl ? '📎 Attachment' : ''),
      attachment_url: opts?.attachmentUrl ?? null,
      created_at: new Date().toISOString(),
      _pending: true,
      _tmpId: tmpId,
    };
    setMessages((prev) => [...prev, optimistic]);
    if (!opts) setText('');
    setError(undefined);
    setSending(true);

    try {
      const saved = await sendMessage({
        conversationId, senderId: myId,
        body: optimistic.body,
        attachmentUrl: opts?.attachmentUrl ?? null,
      });
      setMessages((prev) => prev.map((m) => (m._tmpId === tmpId ? { ...saved } : m)));
    } catch (e: unknown) {
      setMessages((prev) => prev.map((m) => (m._tmpId === tmpId ? { ...m, _pending: false, _failed: true } : m)));
      setError((e as { message?: string })?.message ?? 'Could not send. Tap the message to retry.');
    } finally {
      setSending(false);
    }
  };

  // --- Image attachment ---------------------------------------------------
  const handlePickImage = async (file: File) => {
    if (!conversationId) return;
    if (file.size > 8 * 1024 * 1024) { setError('Image is too large (max 8 MB).'); return; }
    setShowAttach(false);
    setSending(true);
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
      const { url } = await uploadChatAttachment({
        conversationId,
        file,
        extension: ext,
        contentType: file.type || 'image/jpeg',
      });
      await send({ body: '📷 Photo', attachmentUrl: url });
    } catch (e: unknown) {
      setError((e as { message?: string })?.message ?? 'Upload failed.');
    } finally {
      setSending(false);
    }
  };

  // --- Voice recording ----------------------------------------------------
  // Pick a mime type the browser can actually record. Chrome/Firefox/Android
  // record webm/opus; iOS Safari records mp4/aac. We ask the browser which
  // one it supports and use that for both record AND upload so playback
  // works on every device.
  const pickRecordingMime = (): { mime: string; ext: string } => {
    // mp4/aac is the only format that plays everywhere — iOS Safari CANNOT
    // play webm. Prefer it so a note recorded on Android plays on iPhone.
    // Chrome/Edge/Firefox all record mp4 since late 2024.
    const candidates: { mime: string; ext: string }[] = [
      { mime: 'audio/mp4;codecs=mp4a.40.2', ext: 'm4a' },
      { mime: 'audio/mp4',                  ext: 'm4a' },
      { mime: 'audio/aac',                  ext: 'aac' },
      // webm fallback — plays on Android/Chrome but NOT iOS. Last resort.
      { mime: 'audio/webm;codecs=opus',     ext: 'webm' },
      { mime: 'audio/webm',                 ext: 'webm' },
      { mime: 'audio/ogg;codecs=opus',      ext: 'ogg' },
    ];
    for (const c of candidates) {
      if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported?.(c.mime)) {
        return c;
      }
    }
    return { mime: '', ext: 'm4a' };
  };

  const startRecording = async () => {
    if (recording) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const picked = pickRecordingMime();
      recMimeRef.current = picked;
      const mr = picked.mime
        ? new MediaRecorder(stream, { mimeType: picked.mime })
        : new MediaRecorder(stream);
      const chunks: Blob[] = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
      mr.start();
      recRef.current = { mr, chunks, stream, startedAt: Date.now() };
      setRecording(true); setRecSecs(0);
      recTimer.current = window.setInterval(() => setRecSecs((s) => s + 1), 1000);
    } catch (e: unknown) {
      setError('Microphone permission denied.');
    }
  };
  const cancelRecording = () => {
    if (!recRef.current) return;
    const { mr, stream } = recRef.current;
    try { mr.stop(); } catch { /* ignore */ }
    stream.getTracks().forEach((t) => t.stop());
    if (recTimer.current) window.clearInterval(recTimer.current);
    recRef.current = null;
    setRecording(false); setRecSecs(0);
  };
  const stopAndSendRecording = async () => {
    if (!recRef.current || !conversationId) return;
    const { mr, chunks, stream, startedAt } = recRef.current;
    if (recTimer.current) window.clearInterval(recTimer.current);
    setRecording(false);

    await new Promise<void>((resolve) => {
      mr.onstop = () => resolve();
      try { mr.stop(); } catch { resolve(); }
    });
    stream.getTracks().forEach((t) => t.stop());

    const dur = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
    const { mime, ext } = recMimeRef.current;
    // Fall back to whatever the first chunk reported as its own type — this
    // handles browsers (iOS Safari especially) that silently coerce the
    // requested type to something else.
    const blobType = mime || chunks[0]?.type || 'audio/mp4';
    const blob = new Blob(chunks, { type: blobType });
    if (blob.size < 500) { setError('Recording too short.'); recRef.current = null; setRecSecs(0); return; }

    setSending(true);
    try {
      const { url } = await uploadChatAttachment({
        conversationId,
        file: blob,
        extension: ext,
        contentType: blobType,
      });
      await send({ body: `🎤 Voice (${dur}s)`, attachmentUrl: url });
    } catch (e: unknown) {
      setError((e as { message?: string })?.message ?? 'Upload failed.');
    } finally {
      setSending(false);
      recRef.current = null;
      setRecSecs(0);
    }
  };

  const submitText = (e?: FormEvent) => {
    e?.preventDefault();
    void send();
  };

  const grouped = useMemo(() => groupByDay(messages), [messages]);
  const other = conv.data?.counterparty;

  if (initial.loading || conv.loading) {
    return (<><ChatHeader onBack={() => navigate('/chat')} name={null} role={null} loading /><LoadingSpinner fullScreen label="Loading messages…" /></>);
  }
  if (!conv.data) {
    return (<><ChatHeader onBack={() => navigate('/chat')} name={null} role={null} /><EmptyState title="Conversation not found" /></>);
  }

  return (
    <div className="flex flex-col h-dvh bg-surface-muted dark:bg-slate-950">
      <ChatHeader
        onBack={() => navigate('/chat')}
        name={other?.full_name ?? null}
        role={other?.role ?? null}
        avatarUrl={other?.avatar_url ?? undefined}
        onProfileClick={otherId
          ? () => {
              // Patient-viewer → doctor/nurse profile (public directory).
              // Doctor/nurse-viewer → patient details page they manage.
              if (other?.role === 'doctor' || other?.role === 'nurse') {
                navigate(`/doctors/${otherId}`);
              } else if (other?.role === 'patient') {
                navigate(`/patients/${otherId}`);
              }
            }
          : undefined}
        onVoiceCall={() => navigate(`/call/${conversationId}?mode=audio`)}
        onVideoCall={() => navigate(`/call/${conversationId}?mode=video`)}
      />

      <div ref={scrollerRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.length === 0 ? (
          <div className="mt-16 text-center text-sm text-ink-muted">No messages yet. Say hi 👋</div>
        ) : (
          grouped.map((g) => (
            <div key={g.dayKey} className="space-y-1.5">
              <div className="text-center text-[11px] font-bold text-ink-muted my-2">— {g.label} —</div>
              {g.items.map((m, i) => {
                const mine = m.sender_id === myId;
                const seen = mine && !!otherLastRead && new Date(m.created_at) <= new Date(otherLastRead);
                const prev = g.items[i - 1];
                const stacked = prev && prev.sender_id === m.sender_id
                  && (new Date(m.created_at).getTime() - new Date(prev.created_at).getTime()) < 60_000;
                return (
                  <div key={m.id} className={cn('flex', mine ? 'justify-end' : 'justify-start', stacked ? 'mt-0.5' : 'mt-1.5')}>
                    <MessageBubble m={m} mine={mine} seen={seen} onRetry={() => setMessages((prev) => prev.filter((x) => x._tmpId !== m._tmpId))} />
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>

      {error && <div className="px-4 pb-2"><Alert tone="error">{error}</Alert></div>}

      {/* Recording bar (replaces composer when active) */}
      {recording ? (
        <div className="border-t border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-3 flex items-center gap-3 safe-bottom">
          <button
            type="button" onClick={cancelRecording}
            className="grid h-11 w-11 place-items-center rounded-full bg-danger-soft text-danger"
            aria-label="Cancel recording"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="flex-1 flex items-center gap-2 rounded-full bg-danger-soft/40 px-4 py-2">
            <span className="h-2.5 w-2.5 rounded-full bg-danger animate-pulse" />
            <span className="text-sm font-bold text-danger tabular-nums">
              {Math.floor(recSecs / 60).toString().padStart(2, '0')}:{(recSecs % 60).toString().padStart(2, '0')}
            </span>
            <span className="text-xs text-ink-muted">Recording…</span>
          </div>
          <button
            type="button" onClick={stopAndSendRecording}
            className="grid h-11 w-11 place-items-center rounded-full bg-brand-500 text-white shadow-lg shadow-brand-500/30"
            aria-label="Send voice message"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <form
          onSubmit={submitText}
          className="border-t border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2.5 flex items-end gap-2 safe-bottom relative"
        >
          {/* Hidden file input for images */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePickImage(f); e.target.value = ''; }}
          />

          {/* Attachment sheet */}
          {showAttach && (
            <div className="absolute bottom-full left-3 right-3 mb-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-pop p-3 grid grid-cols-3 gap-2">
              <AttachAction icon={<ImageIcon className="h-5 w-5" />} label="Photo" onClick={() => { fileInputRef.current?.click(); }} />
              <AttachAction icon={<Camera className="h-5 w-5" />} label="Camera"
                onClick={() => { fileInputRef.current?.setAttribute('capture', 'environment'); fileInputRef.current?.click(); }} />
              <AttachAction icon={<Paperclip className="h-5 w-5" />} label="File"
                onClick={() => { fileInputRef.current?.removeAttribute('accept'); fileInputRef.current?.click(); }} />
            </div>
          )}

          <button
            type="button"
            onClick={() => setShowAttach((v) => !v)}
            aria-label="Attach"
            className={cn(
              'grid h-10 w-10 place-items-center rounded-full shrink-0 transition',
              showAttach ? 'bg-brand-500 text-white' : 'bg-surface-muted dark:bg-slate-800 text-ink-soft dark:text-slate-300',
            )}
          >
            <Paperclip className="h-4 w-4" />
          </button>

          <textarea
            ref={composerRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitText(); } }}
            rows={1}
            maxLength={4000}
            placeholder="Type a message…"
            className="flex-1 resize-none rounded-full border border-slate-200 dark:border-slate-800 bg-surface-muted dark:bg-slate-800 px-4 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 max-h-32"
          />

          {text.trim() ? (
            <button
              type="submit"
              disabled={sending}
              aria-label="Send"
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-500 text-white shadow-lg shadow-brand-500/30 active:scale-95 transition"
            >
              <Send className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={startRecording}
              aria-label="Record voice message"
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-500 text-white shadow-lg shadow-brand-500/30 active:scale-95 transition"
            >
              <Mic className="h-4 w-4" />
            </button>
          )}
        </form>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Message bubble — text, image, voice
// ---------------------------------------------------------------------------
function MessageBubble({ m, mine, seen, onRetry }: { m: OutgoingMessage; mine: boolean; seen: boolean; onRetry?: () => void }) {
  const isImage = isImageUrl(m.attachment_url);
  const isVoice = isVoiceUrl(m.attachment_url);
  const [imgFull, setImgFull] = useState(false);

  const meta = (
    <div className={cn('flex items-center gap-1 justify-end', mine ? 'text-white/70' : 'text-ink-muted')}>
      <span className="text-[10px] tabular-nums">{m._pending ? 'sending…' : m._failed ? 'failed' : fmtTime(m.created_at)}</span>
      {mine && !m._pending && !m._failed && (
        <span aria-label={seen ? 'Seen' : 'Sent'} className={cn('text-[10px]', seen ? 'text-cyan-200' : 'opacity-60')}>✓✓</span>
      )}
    </div>
  );

  if (isImage && m.attachment_url) {
    return (
      <>
        <button
          type="button"
          onClick={() => setImgFull(true)}
          className={cn(
            'max-w-[78%] rounded-2xl overflow-hidden',
            mine ? 'bg-brand-500' : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800',
            mine ? 'rounded-br-md' : 'rounded-bl-md',
            m._failed && 'ring-2 ring-danger/60',
          )}
        >
          <img src={m.attachment_url} alt="attachment" className="block w-56 h-40 object-cover" />
          <div className={cn('px-3 py-2', mine ? 'text-white' : 'text-ink dark:text-ink-onDark')}>
            {meta}
          </div>
        </button>
        {imgFull && (
          <ImageViewer src={m.attachment_url} onClose={() => setImgFull(false)} />
        )}
      </>
    );
  }

  if (isVoice && m.attachment_url) {
    return <VoiceBubble url={m.attachment_url} mine={mine} meta={meta} pending={m._pending} failed={m._failed} onRetry={onRetry} />;
  }

  return (
    <button
      type="button"
      onClick={m._failed ? onRetry : undefined}
      disabled={!m._failed}
      className={cn(
        'group max-w-[78%] rounded-2xl px-3.5 py-2 text-sm leading-snug text-left',
        mine ? 'bg-brand-500 text-white rounded-br-md' : 'bg-white dark:bg-slate-900 text-ink dark:text-ink-onDark border border-slate-200 dark:border-slate-800 rounded-bl-md',
        m._pending && 'opacity-70',
        m._failed && 'ring-2 ring-danger/60',
      )}
    >
      <div>{m.body}</div>
      {meta}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Voice bubble — play/pause, live progress, static waveform
// ---------------------------------------------------------------------------
function VoiceBubble({
  url, mine, meta, pending, failed, onRetry,
}: {
  url: string; mine: boolean; meta: React.ReactNode;
  pending?: boolean; failed?: boolean; onRetry?: () => void;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const a = new Audio(url);
    audioRef.current = a;
    a.addEventListener('loadedmetadata', () => setDuration(Number.isFinite(a.duration) ? a.duration : 0));
    a.addEventListener('timeupdate', () => setProgress(a.currentTime));
    a.addEventListener('ended', () => { setPlaying(false); setProgress(0); });
    return () => { a.pause(); audioRef.current = null; };
  }, [url]);

  const toggle = () => {
    if (failed) { onRetry?.(); return; }
    const a = audioRef.current; if (!a) return;
    if (playing) { a.pause(); setPlaying(false); }
    else { a.play(); setPlaying(true); }
  };

  const bars = Array.from({ length: 22 }, (_, i) => ((i * 37) % 18) + 6);
  const pct = duration > 0 ? progress / duration : 0;

  return (
    <div
      className={cn(
        'max-w-[78%] rounded-2xl px-3 py-2.5 flex items-center gap-2.5',
        mine ? 'bg-brand-500 text-white rounded-br-md' : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-bl-md',
        pending && 'opacity-70',
        failed && 'ring-2 ring-danger/60',
      )}
    >
      <button
        type="button"
        onClick={toggle}
        className={cn(
          'grid h-9 w-9 shrink-0 place-items-center rounded-full transition',
          mine ? 'bg-white/25 text-white hover:bg-white/35' : 'bg-brand-50 dark:bg-brand-500/15 text-brand-600 dark:text-brand-300 hover:bg-brand-100',
        )}
        aria-label={playing ? 'Pause' : 'Play'}
      >
        {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 translate-x-0.5" />}
      </button>
      <div className="flex items-center gap-0.5">
        {bars.map((h, i) => {
          const filled = i / bars.length <= pct;
          return (
            <div
              key={i}
              className={cn('w-0.5 rounded-full transition-opacity', mine ? 'bg-white' : 'bg-brand-500')}
              style={{ height: `${h}px`, opacity: filled ? 1 : 0.35 }}
            />
          );
        })}
      </div>
      <div className="min-w-[36px] text-right">
        <div className={cn('text-[10px] tabular-nums font-semibold', mine ? 'text-white' : 'text-ink-soft dark:text-slate-300')}>
          {Math.floor((duration - progress) / 60)}:{Math.round((duration - progress) % 60).toString().padStart(2, '0')}
        </div>
        {meta}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Header
// ---------------------------------------------------------------------------
function ChatHeader({
  onBack, name, role, avatarUrl, loading, onProfileClick, onVoiceCall, onVideoCall,
}: {
  onBack: () => void; name: string | null; role: 'patient' | 'doctor' | 'nurse' | 'admin' | null;
  avatarUrl?: string; loading?: boolean; onProfileClick?: () => void;
  onVoiceCall?: () => void; onVideoCall?: () => void;
}) {
  const identity = (
    <>
      <Avatar name={name} src={avatarUrl} size="sm" />
      <div className="min-w-0 flex-1 text-left">
        <div className="truncate text-sm font-bold">
          {loading ? 'Loading…' : (role === 'doctor' ? 'Dr. ' : '') + (name ?? 'User')}
        </div>
        <div className="flex items-center gap-1 text-[11px]">
          <span className="h-1.5 w-1.5 rounded-full bg-success" />
          <span className="font-semibold text-success">Online</span>
        </div>
      </div>
    </>
  );
  return (
    <header className="sticky top-0 z-20 bg-white/95 dark:bg-slate-950/95 backdrop-blur border-b border-slate-200/70 dark:border-slate-800 safe-top">
      <div className="mx-auto flex h-14 max-w-3xl items-center gap-3 px-3">
        <button type="button" onClick={onBack} aria-label="Back" className="grid h-9 w-9 place-items-center rounded-full bg-surface-muted dark:bg-slate-800 text-ink">
          <ArrowLeft className="h-4 w-4" />
        </button>
        {onProfileClick ? (
          <button
            type="button"
            onClick={onProfileClick}
            aria-label={`View profile of ${name ?? 'user'}`}
            className="flex items-center gap-3 flex-1 min-w-0 rounded-lg -mx-1 px-1 py-1 active:bg-slate-100 dark:active:bg-slate-800 transition-colors"
          >
            {identity}
          </button>
        ) : (
          <div className="flex items-center gap-3 flex-1 min-w-0">{identity}</div>
        )}
        <button type="button" onClick={onVideoCall} className="grid h-9 w-9 place-items-center rounded-full bg-surface-muted dark:bg-slate-800 text-ink-soft hover:bg-brand-50 hover:text-brand-600 dark:hover:bg-brand-500/15 dark:hover:text-brand-300 transition" aria-label="Video call">
          <Video className="h-4 w-4" />
        </button>
        <button type="button" onClick={onVoiceCall} className="grid h-9 w-9 place-items-center rounded-full bg-surface-muted dark:bg-slate-800 text-ink-soft hover:bg-brand-50 hover:text-brand-600 dark:hover:bg-brand-500/15 dark:hover:text-brand-300 transition" aria-label="Voice call">
          <Phone className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}

function AttachAction({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 rounded-xl p-3 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
    >
      <span className="grid h-11 w-11 place-items-center rounded-2xl bg-brand-50 dark:bg-brand-500/15 text-brand-600 dark:text-brand-300">
        {icon}
      </span>
      <span className="text-[11px] font-bold">{label}</span>
    </button>
  );
}
