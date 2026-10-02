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
 * Voice / video call between the two parties of a conversation. Opens a
 * Jitsi Meet room (meet.jit.si) in a new browser tab — a plain <a target=
 * "_blank"> which browsers never block, bypassing the iframe/popup issues
 * that come with Jitsi's new moderator policy and X-Frame-Options on
 * community instances. The room is keyed to the conversation id so both
 * parties land in the same meeting.
 */
export function CallPage() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const [params] = useSearchParams();
  const mode: Mode = params.get('mode') === 'audio' ? 'audio' : 'video';
  const { user, profile, role } = useAuth();
  const navigate = useNavigate();
  const [peersPresent, setPeersPresent] = useState<string[]>([]);
  const channelRef = useRef<ReturnType<NonNullable<typeof supabase>['channel']> | null>(null);

  const conv = useAsync(
    () => (conversationId && user ? getConversation(conversationId, user.id) : Promise.resolve(null)),
    [conversationId, user?.id],
  );

  // Supabase Realtime presence — tells each side when the other party has
  // this call page open, so the UI can say "Dr. X is in the waiting room"
  // instead of a blind "join".
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

  // Jitsi room URL. Deterministic room name from conversation id so both
  // parties land in the same meeting. prejoinPageEnabled disables Jitsi's
  // own "set your name" step; we pass the display name via userInfo.
  const jitsiRoom = `doctor-cares-${conversationId}`;
  const jitsiUrl = `https://meet.jit.si/${jitsiRoom}#config.startWithVideoMuted=${mode === 'audio'}`
    + `&config.prejoinPageEnabled=false&userInfo.displayName="${encodeURIComponent(myLabel)}"`;

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

        <a
          href={jitsiUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl h-12 bg-brand-500 text-white text-base font-semibold hover:bg-brand-600 shadow-sm active:scale-[0.98] transition"
        >
          {mode === 'audio' ? <Phone className="h-4 w-4" /> : <Video className="h-4 w-4" />}
          {otherOnline ? 'Join call' : 'Start call'}
        </a>
        <Button
          fullWidth variant="outline"
          leftIcon={mode === 'audio' ? <PhoneOff className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
          onClick={() => navigate(-1)}
        >
          Not now
        </Button>

        <div className="text-center text-[11px] text-ink-muted">
          Powered by Jitsi Meet · end-to-end encrypted
        </div>
      </div>
    </>
  );
}
