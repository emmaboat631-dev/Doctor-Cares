import { supabase } from '@/lib/supabase';
import type { AppointmentMode } from '@/types';

const requireClient = () => {
  if (!supabase) throw new Error('Supabase client is not configured.');
  return supabase;
};

/**
 * A provider is anyone a patient can book: doctor or nurse. Backed by the
 * public.providers VIEW which unions doctor_profiles + nurse_profiles.
 */
export interface Provider {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: 'doctor' | 'nurse';
  specialization: string | null;
  qualifications: string | null;
  bio: string | null;
  years_experience: number | null;
  consultation_fee: number | null;
  modes: AppointmentMode[];
  is_verified: boolean;
  rating: number | null;
  rating_count: number;
  clinic_address: string | null;
  languages: string[];
}

export async function listProviders(params: {
  search?: string;
  role?: 'doctor' | 'nurse' | 'all';
  limit?: number;
} = {}): Promise<Provider[]> {
  const sb = requireClient();
  let q = sb
    .from('providers')
    .select('*')
    .eq('is_verified', true)
    .order('rating', { ascending: false, nullsFirst: false })
    .limit(params.limit ?? 40);

  if (params.role && params.role !== 'all') q = q.eq('role', params.role);

  const { data, error } = await q;
  if (error) throw error;
  const rows = (data ?? []) as Provider[];

  const search = params.search?.trim().toLowerCase();
  if (!search) return rows;
  return rows.filter((r) => {
    const name = (r.full_name ?? '').toLowerCase();
    const spec = (r.specialization ?? '').toLowerCase();
    return name.includes(search) || spec.includes(search);
  });
}

export async function getProvider(id: string): Promise<Provider | null> {
  const sb = requireClient();
  const { data, error } = await sb
    .from('providers')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return (data as Provider | null) ?? null;
}
