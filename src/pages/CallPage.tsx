import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Phone, PhoneOff, Video, VideoOff } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Alert } from '@/components/ui/Alert';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { useAuth } from '@/contexts/AuthContext';
import { useAsync } from '@/hooks/useAsync';
import { getConversation } from '@/lib/api/chat';
import { supabase } from '@/lib/supabase';

type Mode = 'video' | 'audio';

/**
 * Voice / video call between the two parties of a conversation. The Jitsi
 * room is keyed to the conversation id so both sides land in the same
 * meeting. Mode (audio vs video) is passed via ?mode= and controls which
 * Jitsi URL hash params are set.
 *
 * Jitsi notes:
 *  - meet.jit.si's default lobby/moderator check is DISABLED here so solo
 *    testers aren't stuck in "Asking to join" forever
 *  - prejoin + deep-linking disabled so the iframe lands straight in the
 *    call UI and never tries to open a native app
 */
export function CallPage() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const [params] = useSearchParams();
  const mode: Mode = params.get('mode') === 'audio' ? 'audio' : 'video';
  const { user, profile, role } = useAuth();
  const navigate = useNavigate();
  const [inCall, setInCall] = useState(false);
  const [peersPresent, setPeersPresent] = useState<string[]>([]);
  const [roomUrl, setRoomUrl] = useState<string | null>(null);
  const [roomError, setRoomError] = useState<string | undefined>();
  const [provisioning, setProvisioning] = useState(false);
  const channelRef = useRef<ReturnType<NonNullable<typeof supabase>['channel']> | null>(null);

  const conv = useAsync(
    () => (conversationId && user ? getConversation(conversationId, user.id) : Promise.resolve(null)),
    [conversationId, user?.id],
  );

  // Supabase Realtime presence — tells each side when the other party is in
  // the waiting room so they can hit "Join" without a blind entry.
  useEffect(() => {
    if (!supabase || !conversationId || !user) return;
    const channel = supabase.channel(`call:${conversationId}`, {
      config: { presence: { key: user.id } },
    });
    channelRef.current = channel;
    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState() as Record<string, unknown[]>;
        setPeersPresent(Object.keys(state).filter((k) => k !== user.id));
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ user_id: user.id, name: profile?.full_name ?? 'User' });
        }
      });
    return () => { channel.unsubscribe(); channelRef.current = null; };
  }, [conversationId, user?.id, profile?.full_name]);

  if (!conversationId || conv.loading) {
    return (<><Header title="Call" showBack /><LoadingSpinner fullScreen /></>);
  }
  if (!conv.data) {
    return (<><Header title="Call" showBack />
      <EmptyState title="Conversation not found" description="You may not have access." />
    </>);
  }

  const other = conv.data.counterparty;
  const otherOnline = other?.id ? peersPresent.includes(other.id) : false;
  const otherLabel = (other?.role === 'doctor' ? 'Dr. ' : '') + (other?.full_name ?? 'User');
  const myLabel = (role === 'doctor' ? 'Dr. ' : role === 'nurse' ? 'Nurse ' : '') + (profile?.full_name ?? 'User');

  // Daily.co room URL is created on-demand by the create-call-room Edge
  // Function (which calls Daily's API with our secret key). We cache the
  // result for the lifetime of this component so hitting "Leave" and
  // rejoining doesn't re-create a room needlessly.
  const startCall = async () => {
    if (roomUrl || provisioning) { setInCall(true); return; }
    setProvisioning(true);
    setRoomError(undefined);
    try {
      const { data, error } = await supabase!.functions.invoke('create-call-room', {
        body: { conversationId, mode },
      });
      if (error) throw error;
      const d = data as { url?: string; error?: string };
      if (!d.url) throw new Error(d.error ?? 'No room URL returned.');
      // Append the viewer's display name and audio/video mute preference.
      const u = new URL(d.url);
      u.searchParams.set('userName', myLabel);
      if (mode === 'audio') u.searchParams.set('startVideoOff', 'true');
      setRoomUrl(u.toString());
      setInCall(true);
    } catch (e: unknown) {
      setRoomError((e as { message?: string })?.message
        ?? 'Could not start the call. The video service may not be configured yet.');
    } finally {
      setProvisioning(false);
    }
  };

  if (inCall && roomUrl) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex flex-col">
        <div className="flex items-center justify-between gap-3 px-4 h-12 bg-black/90 text-white">
          <div className="text-sm font-bold truncate">
            {mode === 'audio' ? '🎙️ ' : '📹 '}{otherLabel}
          </div>
          <button
            type="button"
            onClick={() => { setInCall(false); navigate(-1); }}
            aria-label="Leave call"
            className="inline-flex items-center gap-1.5 rounded-full bg-rose-600 hover:bg-rose-700 px-3 h-9 text-xs font-bold"
          >
            <PhoneOff className="h-4 w-4" /> Leave
          </button>
        </div>
        <iframe
          src={roomUrl}
          title={mode === 'audio' ? 'Voice call' : 'Video call'}
          allow="camera; microphone; fullscreen; display-capture; autoplay; speaker-selection"
          allowFullScreen
          className="flex-1 w-full border-0"
        />
      </div>
    );
  }

  return (
    <>
      <Header title={mode === 'audio' ? 'Voice call' : 'Video call'} showBack />
      <div className="mx-auto max-w-xl px-4 py-6 pb-24 space-y-4">
        <Card padding="lg" className="text-center">
          <Avatar name={other?.full_name} src={other?.avatar_url ?? undefined} size="xl" className="mx-auto" />
          <div className="mt-3 text-lg font-bold">{otherLabel}</div>
          <div className="mt-1 text-xs text-ink-muted">
            {mode === 'audio' ? 'Voice call via Doctor Cares' : 'Video call via Doctor Cares'}
          </div>

          <div className="mt-4 flex items-center justify-center gap-2 text-xs">
            <span className={`inline-block h-2 w-2 rounded-full ${otherOnline ? 'bg-emerald-500' : 'bg-amber-500'}`} />
            <span className="font-semibold">
              {otherOnline
                ? `${(other?.full_name ?? 'They').split(' ')[0]} is in the waiting room`
                : `Waiting for ${(other?.full_name ?? 'the other side')}…`}
            </span>
          </div>
        </Card>

        <Alert tone="info">
          Your browser will ask for {mode === 'audio' ? 'microphone' : 'camera and microphone'} permission —
          allow it so the call can start.
        </Alert>

        {roomError && <Alert tone="error">{roomError}</Alert>}

        <Button
          fullWidth size="lg"
          loading={provisioning}
          leftIcon={mode === 'audio' ? <Phone className="h-4 w-4" /> : <Video className="h-4 w-4" />}
          onClick={startCall}
        >
          {otherOnline ? 'Join call' : 'Start call anyway'}
        </Button>
        <Button
          fullWidth variant="outline"
          leftIcon={mode === 'audio' ? <PhoneOff className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
          onClick={() => navigate(-1)}
        >
          Not now
        </Button>

        <div className="text-center text-[11px] text-ink-muted">
          Powered by Daily.co · end-to-end encrypted
        </div>
      </div>
    </>
  );
}
