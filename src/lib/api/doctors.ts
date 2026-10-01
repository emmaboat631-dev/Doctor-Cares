import { supabase } from '@/lib/supabase';
import type { DoctorProfile, Profile } from '@/types';

export interface DoctorListItem extends DoctorProfile {
  profile: Pick<Profile, 'id' | 'full_name' | 'avatar_url' | 'status'>;
}

const requireClient = () => {
  if (!supabase) throw new Error('Supabase client is not configured.');
  return supabase;
};

/**
 * Browse verified doctors, optionally filtered by search + specialty.
 * RLS restricts rows to is_verified = true unless the caller is that doctor
 * or an admin — so a patient always sees only the marketplace list.
 */
export async function listDoctors(params: {
  search?: string;
  specialty?: string | null;
  limit?: number;
} = {}): Promise<DoctorListItem[]> {
  const sb = requireClient();
  let q = sb
    .from('doctor_profiles')
    .select('*, profile:profiles!doctor_profiles_id_fkey(id, full_name, avatar_url, status)')
    .eq('is_verified', true)
    .order('rating', { ascending: false, nullsFirst: false })
    .limit(params.limit ?? 40);

  if (params.specialty) q = q.eq('specialty', params.specialty);

  const { data, error } = await q;
  if (error) throw error;
  const rows = (data ?? []) as unknown as DoctorListItem[];

  const search = params.search?.trim().toLowerCase();
  if (!search) return rows.filter((r) => r.profile?.status === 'active');

  return rows.filter((r) => {
    if (r.profile?.status !== 'active') return false;
    const name = (r.profile?.full_name ?? '').toLowerCase();
    const specialty = (r.specialty ?? '').toLowerCase();
    return name.includes(search) || specialty.includes(search);
  });
}

/** Distinct specialties among verified doctors — used for filter chips. */
export async function listSpecialties(): Promise<string[]> {
  const sb = requireClient();
  const { data, error } = await sb
    .from('doctor_profiles')
    .select('specialty')
    .eq('is_verified', true)
    .not('specialty', 'is', null);
  if (error) throw error;
  const uniq = Array.from(new Set((data ?? []).map((r) => (r as { specialty: string }).specialty))).sort();
  return uniq;
}

export async function getDoctor(id: string): Promise<DoctorListItem | null> {
  const sb = requireClient();
  const { data, error } = await sb
    .from('doctor_profiles')
    .select('*, profile:profiles!doctor_profiles_id_fkey(id, full_name, avatar_url, status)')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return (data as unknown as DoctorListItem | null);
}

// -- Doctor self-service --------------------------------------------------

/** Same as getDoctor but not filtered by is_verified — doctors can read their own. */
export async function getMyDoctorProfile(id: string) {
  return getDoctor(id);
}

export async function updateMyDoctorProfile(id: string, patch: Partial<{
  specialty: string | null;
  qualifications: string | null;
  bio: string | null;
  years_experience: number | null;
  consultation_fee: number | null;
  modes: ('video' | 'clinic' | 'home')[];
  clinic_address: string | null;
  languages: string[];
}>): Promise<void> {
  const sb = requireClient();
  const { error } = await sb.from('doctor_profiles').update(patch).eq('id', id);
  if (error) throw error;
}
