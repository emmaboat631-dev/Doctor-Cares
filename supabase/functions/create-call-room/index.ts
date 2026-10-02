// ============================================================================
// Doctor Cares — Edge Function · create-call-room
// ============================================================================
// Creates (or re-uses) a Daily.co video room keyed to a conversation id.
// Daily rooms expire after 24h to keep free-tier usage low.
//
// Secrets required (set via supabase secrets set):
//   DAILY_API_KEY       — API key from https://dashboard.daily.co/developers
//
// Called from the client as:
//   const { data } = await supabase.functions.invoke('create-call-room', {
//     body: { conversationId, mode }   // mode: 'audio' | 'video'
//   })
//   // data.url is the ready-to-use Daily room URL
// ============================================================================

import { serve } from 'https://deno.land/std@0.203.0/http/server.ts';

const DAILY_API_KEY = Deno.env.get('DAILY_API_KEY')!;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  // Must include apikey + x-client-info because supabase-js adds them on
  // every invoke() call; without them the browser preflight fails and the
  // client sees "Failed to send a request to the Edge Function".
  'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (!DAILY_API_KEY) {
    return new Response(JSON.stringify({ error: 'DAILY_API_KEY not set' }),
      { status: 500, headers: { ...CORS, 'content-type': 'application/json' } });
  }

  try {
    const { conversationId, mode } = await req.json() as { conversationId: string; mode?: 'audio' | 'video' };
    if (!conversationId) {
      return new Response(JSON.stringify({ error: 'conversationId required' }),
        { status: 400, headers: { ...CORS, 'content-type': 'application/json' } });
    }

    const roomName = `dc-${conversationId}`.slice(0, 60);
    const exp = Math.floor(Date.now() / 1000) + 24 * 60 * 60;

    // Try to fetch an existing room first; if it exists and hasn't expired,
    // reuse it so both parties land in the same meeting.
    const existing = await fetch(`https://api.daily.co/v1/rooms/${roomName}`, {
      headers: { Authorization: `Bearer ${DAILY_API_KEY}` },
    });
    if (existing.ok) {
      const room = await existing.json();
      return new Response(JSON.stringify({ url: room.url }), {
        headers: { ...CORS, 'content-type': 'application/json' },
      });
    }

    // Otherwise create a fresh room.
    const createRes = await fetch('https://api.daily.co/v1/rooms', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${DAILY_API_KEY}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        name: roomName,
        privacy: 'public',
        properties: {
          exp,
          max_participants: 4,
          enable_prejoin_ui: false,
          enable_knocking: false,
          start_video_off: mode === 'audio',
          start_audio_off: false,
          enable_chat: true,
          enable_screenshare: true,
          lang: 'en',
        },
      }),
    });

    if (!createRes.ok) {
      const errText = await createRes.text();
      return new Response(JSON.stringify({ error: 'Daily API error', detail: errText }),
        { status: 502, headers: { ...CORS, 'content-type': 'application/json' } });
    }
    const created = await createRes.json();
    return new Response(JSON.stringify({ url: created.url }), {
      headers: { ...CORS, 'content-type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }),
      { status: 500, headers: { ...CORS, 'content-type': 'application/json' } });
  }
});
