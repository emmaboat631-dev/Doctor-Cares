import { supabase } from '@/lib/supabase';

const requireClient = () => {
  if (!supabase) throw new Error('Supabase client is not configured.');
  return supabase;
};

/**
 * Upload a chat attachment to the chat-attachments bucket.
 * Files are stored under `<conversation_id>/<uuid>.<ext>` so the RLS policy
 * (which uses the first path segment as the conversation id) authorises it.
 */
export async function uploadChatAttachment(params: {
  conversationId: string;
  file: Blob;
  extension: string;
  contentType: string;
}): Promise<{ url: string; path: string }> {
  const sb = requireClient();
  const uuid = crypto.randomUUID();
  const path = `${params.conversationId}/${uuid}.${params.extension}`;

  const { error } = await sb.storage.from('chat-attachments').upload(path, params.file, {
    contentType: params.contentType,
    upsert: false,
  });
  if (error) throw error;

  // chat-attachments is a PRIVATE bucket — sign a URL that lasts a year.
  const { data, error: signErr } = await sb.storage
    .from('chat-attachments')
    .createSignedUrl(path, 60 * 60 * 24 * 365);
  if (signErr) throw signErr;

  return { url: data.signedUrl, path };
}

/** Ask Supabase to re-sign a private attachment URL — expired ones return a fresh URL. */
export async function refreshSignedUrl(path: string, expiresIn = 60 * 60 * 24 * 365): Promise<string> {
  const sb = requireClient();
  const { data, error } = await sb.storage.from('chat-attachments').createSignedUrl(path, expiresIn);
  if (error) throw error;
  return data.signedUrl;
}

/**
 * Upload (or replace) a user's avatar. Stored under `<user_id>/avatar-<ts>.<ext>`
 * so the "avatars owner writes" RLS policy (first path segment must be auth.uid())
 * authorises it. The bucket is public, so we return a plain public URL.
 * Timestamp in the filename busts CDN + browser cache after a change.
 */
export async function uploadAvatar(params: {
  userId: string;
  file: Blob;
  extension: string;
  contentType: string;
}): Promise<{ url: string; path: string }> {
  const sb = requireClient();
  const ext = params.extension.replace(/^\./, '').toLowerCase();
  const path = `${params.userId}/avatar-${Date.now()}.${ext}`;

  const { error } = await sb.storage.from('avatars').upload(path, params.file, {
    contentType: params.contentType,
    upsert: false,
  });
  if (error) throw error;

  const { data } = sb.storage.from('avatars').getPublicUrl(path);
  return { url: data.publicUrl, path };
}
