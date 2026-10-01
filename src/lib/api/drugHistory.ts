import { supabase } from '@/lib/supabase';
import type { DrugSearchHistoryRow } from '@/types/database';

const requireClient = () => {
  if (!supabase) throw new Error('Supabase client is not configured.');
  return supabase;
};

/** Latest N unique drug names the user has viewed. */
export async function listRecentSearches(userId: string, limit = 8): Promise<DrugSearchHistoryRow[]> {
  const sb = requireClient();
  const { data, error } = await sb
    .from('drug_search_history')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;

  // Dedupe by drug_name (case-insensitive), keep most recent per name.
  const seen = new Set<string>();
  const rows: DrugSearchHistoryRow[] = [];
  for (const r of (data ?? []) as DrugSearchHistoryRow[]) {
    const key = (r.drug_name ?? r.query).toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push(r);
    if (rows.length >= limit) break;
  }
  return rows;
}

export async function saveDrugSearch(userId: string, query: string, drugName: string | null): Promise<void> {
  const sb = requireClient();
  const { error } = await sb.from('drug_search_history').insert({
    user_id: userId,
    query: query.slice(0, 200),
    drug_name: drugName?.slice(0, 200) ?? null,
  });
  if (error) throw error;
}

export async function clearDrugHistory(userId: string): Promise<void> {
  const sb = requireClient();
  const { error } = await sb.from('drug_search_history').delete().eq('user_id', userId);
  if (error) throw error;
}
