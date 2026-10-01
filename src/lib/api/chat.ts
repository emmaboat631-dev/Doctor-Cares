import { supabase } from '@/lib/supabase';
import type { Conversation, Message, Profile } from '@/types';

const requireClient = () => {
  if (!supabase) throw new Error('Supabase client is not configured.');
  return supabase;
};

export interface ConversationListItem extends Conversation {
  /** The OTHER participant — never the current user. */
  counterparty: Pick<Profile, 'id' | 'full_name' | 'avatar_url' | 'role' | 'last_seen_at'> | null;
  last_message: string | null;
  unread_count: number;
}

/**
 * Load the caller's conversations enriched with:
 *  - the counterparty profile (whichever side isn't me)
 *  - the most-recent message preview
 *  - an unread count vs my participant.last_read_at
 * All in a handful of queries — no N+1.
 */
export async function listMyConversations(myId: string): Promise<ConversationListItem[]> {
  const sb = requireClient();

  const { data: convs, error: cErr } = await sb
    .from('conversations')
    .select(`
      id, patient_id, doctor_id, last_message_at, created_at, updated_at,
      patient:profiles!conversations_patient_id_fkey(id, full_name, avatar_url, role, last_seen_at),
      doctor:profiles!conversations_doctor_id_fkey(id, full_name, avatar_url, role, last_seen_at)
    `)
    .order('last_message_at', { ascending: false, nullsFirst: false });
  if (cErr) throw cErr;

  const rows = (convs ?? []) as unknown as Array<Conversation & {
    patient: Pick<Profile, 'id' | 'full_name' | 'avatar_url' | 'role' | 'last_seen_at'> | null;
    doctor: Pick<Profile, 'id' | 'full_name' | 'avatar_url' | 'role' | 'last_seen_at'> | null;
  }>;

  if (rows.length === 0) return [];

  const ids = rows.map((r) => r.id);

  // Batch: my last_read_at across all conversations
  const { data: parts, error: pErr } = await sb
    .from('conversation_participants')
    .select('conversation_id, last_read_at')
    .eq('user_id', myId)
    .in('conversation_id', ids);
  if (pErr) throw pErr;
  const readMap = new Map<string, string | null>();
  for (const p of (parts ?? []) as { conversation_id: string; last_read_at: string | null }[]) {
    readMap.set(p.conversation_id, p.last_read_at);
  }

  // Batch: the latest message per conversation (using window of top 1 per group
  // isn't trivial in PostgREST; simplest is fetch recent messages then reduce).
  const { data: msgs, error: mErr } = await sb
    .from('messages')
    .select('conversation_id, body, created_at, sender_id')
    .in('conversation_id', ids)
    .order('created_at', { ascending: false })
    .limit(200);
  if (mErr) throw mErr;

  const latestByConv = new Map<string, { body: string; created_at: string; sender_id: string }>();
  const unreadCounts = new Map<string, number>();
  for (const m of (msgs ?? []) as { conversation_id: string; body: string; created_at: string; sender_id: string }[]) {
    if (!latestByConv.has(m.conversation_id)) latestByConv.set(m.conversation_id, m);
    if (m.sender_id !== myId) {
      const lastRead = readMap.get(m.conversation_id);
      if (!lastRead || new Date(m.created_at) > new Date(lastRead)) {
        unreadCounts.set(m.conversation_id, (unreadCounts.get(m.conversation_id) ?? 0) + 1);
      }
    }
  }

  return rows.map<ConversationListItem>((c) => ({
    ...c,
    counterparty: c.patient_id === myId ? c.doctor : c.patient,
    last_message: latestByConv.get(c.id)?.body ?? null,
    unread_count: unreadCounts.get(c.id) ?? 0,
  }));
}

export async function getConversation(id: string, myId: string): Promise<ConversationListItem | null> {
  const sb = requireClient();
  const { data, error } = await sb
    .from('conversations')
    .select(`
      id, patient_id, doctor_id, last_message_at, created_at, updated_at,
      patient:profiles!conversations_patient_id_fkey(id, full_name, avatar_url, role, last_seen_at),
      doctor:profiles!conversations_doctor_id_fkey(id, full_name, avatar_url, role, last_seen_at)
    `)
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const c = data as unknown as Conversation & {
    patient: Pick<Profile, 'id' | 'full_name' | 'avatar_url' | 'role' | 'last_seen_at'> | null;
    doctor: Pick<Profile, 'id' | 'full_name' | 'avatar_url' | 'role' | 'last_seen_at'> | null;
  };
  return {
    ...c,
    counterparty: c.patient_id === myId ? c.doctor : c.patient,
    last_message: null,
    unread_count: 0,
  };
}

export async function listMessages(conversationId: string, limit = 200): Promise<Message[]> {
  const sb = requireClient();
  const { data, error } = await sb
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as unknown as Message[];
}

export async function sendMessage(params: {
  conversationId: string;
  senderId: string;
  body: string;
  attachmentUrl?: string | null;
}): Promise<Message> {
  const sb = requireClient();
  const { data, error } = await sb
    .from('messages')
    .insert({
      conversation_id: params.conversationId,
      sender_id: params.senderId,
      body: params.body,
      attachment_url: params.attachmentUrl ?? null,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data as unknown as Message;
}

/** Fetch the OTHER participant's last_read_at — used for "Seen ✓✓" receipts. */
export async function getOtherLastRead(conversationId: string, myId: string): Promise<string | null> {
  const sb = requireClient();
  const { data, error } = await sb
    .from('conversation_participants')
    .select('user_id, last_read_at')
    .eq('conversation_id', conversationId);
  if (error) throw error;
  const rows = (data ?? []) as { user_id: string; last_read_at: string | null }[];
  const other = rows.find((r) => r.user_id !== myId);
  return other?.last_read_at ?? null;
}

export async function markConversationRead(conversationId: string, userId: string): Promise<void> {
  const sb = requireClient();
  const { error } = await sb
    .from('conversation_participants')
    .update({ last_read_at: new Date().toISOString() })
    .eq('conversation_id', conversationId)
    .eq('user_id', userId);
  if (error) throw error;
}

/**
 * Start (or fetch existing) conversation with a specific user. Enforces the
 * doctor-patient relationship prerequisite in the DB via SECURITY DEFINER.
 * Returns the conversation id.
 */
export async function openConversationWith(targetUserId: string): Promise<string> {
  const sb = requireClient();
  const { data, error } = await sb.rpc('get_or_create_conversation', { _target_user: targetUserId });
  if (error) throw error;
  return data as unknown as string;
}
