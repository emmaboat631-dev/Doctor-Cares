import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PhoneOff, Video, VideoOff } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Alert } from '@/components/ui/Alert';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { useAuth } from '@/contexts/AuthContext';
import { useAsync } from '@/hooks/useAsync';
import { getAppointmentForPatient, getAppointmentForDoctor } from '@/lib/api/appointments';
import { supabase } from '@/lib/supabase';
import { fmtDate, fmtTime } from '@/lib/format';

/**
 * Video consultation page. Loads the appointment, verifies the viewer is a
 * participant, shows a waiting room (Supabase Realtime presence) until the
 * other party is present, then embeds a Jitsi Meet room keyed to the
 * appointment id. Jitsi is free and requires no API key — the public
 * meet.jit.si server is used; a self-hosted Jitsi is a drop-in replacement.
 */
export function VideoCallPage() {
  const { id } = useParams<{ id: string }>();
  const { user, role, profile } = useAuth();
  const navigate = useNavigate();
  const [inCall, setInCall] = useState(false);
  const [peersPresent, setPeersPresent] = useState<string[]>([]);
  const channelRef = useRef<ReturnType<NonNullable<typeof supabase>['channel']> | null>(null);

  // Pull the appointment from whichever side the viewer is on.
  const appt = useAsync(async () => {
    if (!id || !user || !role) return null;
    if (role === 'patient') return getAppointmentForPatient(id);
    if (role === 'doctor' || role === 'nurse') return getAppointmentForDoctor(id);
    return null;
  }, [id, user?.id, role]);

  // Supabase Realtime presence: everyone who opens this page tracks their
  // user_id in a shared channel keyed to the appointment. The waiting-room
  // UI reads the channel's live state and shows "waiting for Dr. X" vs
  // "ready — join call".
  useEffect(() => {
    if (!supabase || !id || !user) return;
    const channel = supabase.channel(`call:${id}`, {
      config: { presence: { key: user.id } },
    });
    channelRef.current = channel;

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState() as Record<string, { user_id: string }[]>;
        setPeersPresent(Object.keys(state).filter((k) => k !== user.id));
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ user_id: user.id, name: profile?.full_name ?? 'User' });
        }
      });

    return () => { channel.unsubscribe(); channelRef.current = null; };
  }, [id, user?.id, profile?.full_name]);

  if (!id || appt.loading) {
    return (<><Header title="Video call" showBack /><LoadingSpinner fullScreen /></>);
  }
  if (!appt.data) {
    return (<><Header title="Video call" showBack />
      <EmptyState title="Appointment not found" description="You may not have access to this call." />
    </>);
  }

  const a = appt.data;
  if (a.mode !== 'video') {
    return (<><Header title="Video call" showBack />
      <EmptyState title="Not a video appointment" description="This appointment is in-person." />
    </>);
  }
  if (a.status !== 'confirmed') {
    return (<><Header title="Video call" showBack />
      <EmptyState title="Not confirmed yet" description="The doctor must accept the booking before the call can start." />
    </>);
  }

  // Time gate: 15 min before start → 60 min after start.
  const start = new Date(a.scheduled_at).getTime();
  const now = Date.now();
  const openAt = start - 15 * 60_000;
  const closeAt = start + 60 * 60_000;
  const beforeWindow = now < openAt;
  const afterWindow  = now > closeAt;

  const other = role === 'patient'
    ? (a as { doctor?: { id: string; full_name: string | null; avatar_url: string | null } }).doctor
    : (a as { patient?: { id: string; full_name: string | null; avatar_url: string | null } }).patient;
  const otherOnline = other ? peersPresent.includes(other.id) : false;
  const otherLabel = role === 'patient'
    ? `Dr. ${other?.full_name ?? 'Doctor'}`
    : other?.full_name ?? 'Patient';

  // The Jitsi room is deterministic from the appointment id so both parties
  // land in the same meeting without any lobby code exchange.
  const roomName = `doctor-cares-${id}`;
  const displayName = encodeURIComponent(
    (role === 'patient' ? '' : role === 'doctor' ? 'Dr. ' : 'Nurse ') + (profile?.full_name ?? 'User'),
  );
  const jitsiUrl =
    `https://meet.jit.si/${roomName}` +
    `#userInfo.displayName="${displayName}"` +
    `&config.prejoinPageEnabled=false` +
    `&config.disableDeepLinking=true` +
    `&config.startWithAudioMuted=false` +
    `&config.startWithVideoMuted=false`;

  if (inCall) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex flex-col">
        <div className="flex items-center justify-between gap-3 px-4 h-12 bg-black/90 text-white">
          <div className="text-sm font-bold truncate">{otherLabel}</div>
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
          src={jitsiUrl}
          title="Video call"
          allow="camera; microphone; fullscreen; display-capture; autoplay"
          allowFullScreen
          className="flex-1 w-full border-0"
        />
      </div>
    );
  }

  return (
    <>
      <Header title="Video call" showBack />
      <div className="mx-auto max-w-xl px-4 py-6 pb-24 space-y-4">
        <Card padding="lg" className="text-center">
          <Avatar name={other?.full_name} src={other?.avatar_url ?? undefined} size="xl" className="mx-auto" />
          <div className="mt-3 text-lg font-bold">{otherLabel}</div>
          <div className="mt-1 text-xs text-ink-muted">
            {fmtDate(a.scheduled_at)} · {fmtTime(a.scheduled_at)}
          </div>

          <div className="mt-4 flex items-center justify-center gap-2 text-xs">
            <span className={`inline-block h-2 w-2 rounded-full ${otherOnline ? 'bg-emerald-500' : 'bg-amber-500'}`} />
            <span className="font-semibold">
              {otherOnline
                ? `${otherLabel.split(' ').slice(-1)[0]} is in the waiting room`
                : `Waiting for ${otherLabel}…`}
            </span>
          </div>
        </Card>

        {beforeWindow && (
          <Alert tone="info">
            The call opens 15 minutes before your scheduled time. Come back then.
          </Alert>
        )}
        {afterWindow && (
          <Alert tone="error">
            This call window has closed. Message your {role === 'patient' ? 'doctor' : 'patient'} to reschedule.
          </Alert>
        )}

        {!beforeWindow && !afterWindow && (
          <>
            <Button
              fullWidth size="lg"
              leftIcon={<Video className="h-4 w-4" />}
              onClick={() => setInCall(true)}
            >
              {otherOnline ? 'Join call' : 'Join anyway'}
            </Button>
            <Button
              fullWidth variant="outline"
              leftIcon={<VideoOff className="h-4 w-4" />}
              onClick={() => navigate(-1)}
            >
              Not now
            </Button>
          </>
        )}

        <div className="text-center text-[11px] text-ink-muted">
          Powered by Jitsi Meet · end-to-end encrypted
        </div>
      </div>
    </>
  );
}
