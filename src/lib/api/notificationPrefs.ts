import { supabase } from '@/lib/supabase';

const requireClient = () => {
  if (!supabase) throw new Error('Supabase client is not configured.');
  return supabase;
};

export interface NotificationPrefs {
  user_id: string;
  appointments: boolean;
  reminders: boolean;
  chat: boolean;
  referrals: boolean;
  tips: boolean;
  claims: boolean;
  marketing: boolean;
  updated_at: string;
}

/** Returns the user's prefs, creating a default row on first call. */
export async function getNotificationPrefs(userId: string): Promise<NotificationPrefs> {
  const sb = requireClient();
  const { data, error } = await sb.rpc('ensure_notification_prefs', { _uid: userId });
  if (error) throw error;
  return data as NotificationPrefs;
}

export async function updateNotificationPrefs(userId: string, patch: Partial<Omit<NotificationPrefs, 'user_id' | 'updated_at'>>): Promise<NotificationPrefs> {
  const sb = requireClient();
  const { data, error } = await sb
    .from('notification_prefs')
    .update(patch)
    .eq('user_id', userId)
    .select('*')
    .single();
  if (error) throw error;
  return data as NotificationPrefs;
}
