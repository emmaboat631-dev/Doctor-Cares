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
  if (data) return data as unknown as DoctorListItem;

  // Fallback: this id might be a nurse. Query nurse_profiles the same way
  // and normalize specialization → specialty so the shared profile UI works.
  const { data: nurse, error: nErr } = await sb
    .from('nurse_profiles')
    .select('*, profile:profiles!nurse_profiles_id_fkey(id, full_name, avatar_url, status)')
    .eq('id', id)
    .maybeSingle();
  if (nErr) throw nErr;
  if (!nurse) return null;
  const n = nurse as unknown as (DoctorListItem & { specialization?: string | null });
  if (!n.specialty && n.specialization) n.specialty = n.specialization;
  return n;
}

// -- Doctor self-service --------------------------------------------------

/** Same as getDoctor but not filtered by is_verified — doctors can read their own. */
/**
 * Returns the current user's own provider profile — doctor_profiles for
 * doctors, nurse_profiles for nurses — normalized to the DoctorListItem
 * shape so the shared doctor-side UI can render either without branching.
 */
export async function getMyDoctorProfile(id: string): Promise<DoctorListItem | null> {
  const sb = requireClient();
  const doc = await getDoctor(id);
  if (doc) return doc;
  const { data, error } = await sb
    .from('nurse_profiles')
    .select('*, profile:profiles!nurse_profiles_id_fkey(id, full_name, avatar_url, status)')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const n = data as unknown as (DoctorListItem & { specialization?: string | null });
  // Nurse table uses `specialization`; doctor table uses `specialty`.
  // Normalize so the UI reads one field.
  if (!n.specialty && n.specialization) n.specialty = n.specialization;
  return n;
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
  // Try doctor_profiles first; if nothing updates (nurse user), fall through
  // to nurse_profiles — specialty maps to specialization.
  const { data: upd, error } = await sb
    .from('doctor_profiles').update(patch).eq('id', id).select('id');
  if (error) throw error;
  if ((upd ?? []).length > 0) return;

  const nursePatch: Record<string, unknown> = { ...patch };
  if ('specialty' in patch) {
    nursePatch.specialization = patch.specialty;
    delete nursePatch.specialty;
  }
  const { error: nurseErr } = await sb.from('nurse_profiles').update(nursePatch).eq('id', id);
  if (nurseErr) throw nurseErr;
}
