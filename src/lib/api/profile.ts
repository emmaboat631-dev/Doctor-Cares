import { supabase } from '@/lib/supabase';
import type { PatientProfile, Profile } from '@/types';

const requireClient = () => {
  if (!supabase) throw new Error('Supabase client is not configured.');
  return supabase;
};

export async function getPatientProfile(id: string): Promise<PatientProfile | null> {
  const sb = requireClient();
  const { data, error } = await sb.from('patient_profiles').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return (data as unknown as PatientProfile | null);
}

export async function updateBaseProfile(id: string, patch: Partial<Pick<Profile, 'full_name' | 'phone' | 'avatar_url'>>): Promise<Profile> {
  const sb = requireClient();
  const { data, error } = await sb.from('profiles').update(patch).eq('id', id).select('*').single();
  if (error) throw error;
  return data as unknown as Profile;
}

export async function updatePatientProfile(id: string, patch: Partial<Pick<PatientProfile, 'date_of_birth' | 'gender' | 'blood_group' | 'allergies' | 'emergency_contact_name' | 'emergency_contact_phone' | 'emergency_contact_relation' | 'height_cm' | 'chronic_conditions' | 'current_medications' | 'past_surgeries' | 'immunizations' | 'family_history' | 'smoking_status' | 'alcohol_use'>>): Promise<PatientProfile> {
  const sb = requireClient();
  const { data, error } = await sb.from('patient_profiles').update(patch).eq('id', id).select('*').single();
  if (error) throw error;
  return data as unknown as PatientProfile;
}

export async function countPatientStats(patientId: string): Promise<{ appointments: number; doctors: number }> {
  const sb = requireClient();
  const { data, error } = await sb
    .from('appointments')
    .select('doctor_id')
    .eq('patient_id', patientId);
  if (error) throw error;
  const rows = (data ?? []) as { doctor_id: string }[];
  return {
    appointments: rows.length,
    doctors: new Set(rows.map((r) => r.doctor_id)).size,
  };
}
