import { supabase } from '@/lib/supabase';

const requireClient = () => {
  if (!supabase) throw new Error('Supabase client is not configured.');
  return supabase;
};

export interface HealthTip {
  id: string;
  title: string;
  body: string;
  image_url: string | null;
  category: string | null;
  is_published: boolean;
  published_at: string | null;
  author_id: string | null;
  created_at: string;
  updated_at: string;
}

/** Published tips for the patient home feed. */
export async function listPublishedTips(limit = 20): Promise<HealthTip[]> {
  const sb = requireClient();
  const { data, error } = await sb
    .from('health_tips')
    .select('*')
    .eq('is_published', true)
    .order('published_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  // Defensive: Supabase has returned non-array shapes in edge cases
  // (schema cache miss, PostgREST issue). Always hand callers an array
  // so the UI can safely .map() over the result.
  return Array.isArray(data) ? (data as HealthTip[]) : [];
}

export async function getTip(id: string): Promise<HealthTip | null> {
  const sb = requireClient();
  const { data, error } = await sb.from('health_tips').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return (data as HealthTip | null) ?? null;
}

/** Admin — all tips (draft + published). */
export async function listAllTips(limit = 100): Promise<HealthTip[]> {
  const sb = requireClient();
  const { data, error } = await sb
    .from('health_tips')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return Array.isArray(data) ? (data as HealthTip[]) : [];
}

export async function createTip(params: {
  title: string;
  body: string;
  category?: string | null;
  imageUrl?: string | null;
  publish?: boolean;
  authorId?: string | null;
}): Promise<HealthTip> {
  const sb = requireClient();
  const row = {
    title: params.title,
    body: params.body,
    category: params.category ?? null,
    image_url: params.imageUrl ?? null,
    author_id: params.authorId ?? null,
    is_published: !!params.publish,
    published_at: params.publish ? new Date().toISOString() : null,
  };
  const { data, error } = await sb.from('health_tips').insert(row).select('*').single();
  if (error) throw error;
  return data as HealthTip;
}

export async function updateTip(
  id: string,
  patch: Partial<Pick<HealthTip, 'title' | 'body' | 'category' | 'image_url' | 'is_published'>>,
): Promise<HealthTip> {
  const sb = requireClient();
  const body: Record<string, unknown> = { ...patch };
  // Flip published_at when toggling is_published.
  if (patch.is_published !== undefined) {
    body.published_at = patch.is_published ? new Date().toISOString() : null;
  }
  const { data, error } = await sb.from('health_tips').update(body).eq('id', id).select('*').single();
  if (error) throw error;
  return data as HealthTip;
}

export async function deleteTip(id: string): Promise<void> {
  const sb = requireClient();
  const { error } = await sb.from('health_tips').delete().eq('id', id);
  if (error) throw error;
}
