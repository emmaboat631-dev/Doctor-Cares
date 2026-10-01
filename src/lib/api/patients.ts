import { supabase } from '@/lib/supabase';
import type { PatientProfile, Profile } from '@/types';

const requireClient = () => {
  if (!supabase) throw new Error('Supabase client is not configured.');
  return supabase;
};

export interface DoctorPatient {
  profile: Pick<Profile, 'id' | 'full_name' | 'avatar_url' | 'status'>;
  last_visit_at: string | null;
  visit_count: number;
  next_visit_at: string | null;
}

/**
 * Distinct patients the current doctor has had appointments with, with basic
 * aggregation (visit counts + last/next). RLS on `patient_profiles` allows
 * the doctor to read medical data only when a shared appointment exists.
 */
export async function listMyPatients(doctorId: string): Promise<DoctorPatient[]> {
  const sb = requireClient();
  const { data, error } = await sb
    .from('appointments')
    .select(`
      patient_id, scheduled_at, status,
      patient:profiles!appointments_patient_id_fkey(id, full_name, avatar_url, status)
    `)
    .eq('doctor_id', doctorId)
    .order('scheduled_at', { ascending: false });
  if (error) throw error;

  const rows = (data ?? []) as unknown as Array<{
    patient_id: string;
    scheduled_at: string;
    status: string;
    patient: Pick<Profile, 'id' | 'full_name' | 'avatar_url' | 'status'>;
  }>;

  const byPatient = new Map<string, DoctorPatient>();
  const now = Date.now();
  for (const r of rows) {
    if (!r.patient) continue;
    const cur = byPatient.get(r.patient_id);
    const time = new Date(r.scheduled_at).getTime();
    const isPast = time < now || r.status === 'completed';
    const isFutureLive = time >= now && (r.status === 'confirmed' || r.status === 'pending');

    if (!cur) {
      byPatient.set(r.patient_id, {
        profile: r.patient,
        last_visit_at: isPast ? r.scheduled_at : null,
        next_visit_at: isFutureLive ? r.scheduled_at : null,
        visit_count: 1,
      });
    } else {
      cur.visit_count += 1;
      if (isPast && (!cur.last_visit_at || new Date(cur.last_visit_at).getTime() < time)) {
        cur.last_visit_at = r.scheduled_at;
      }
      if (isFutureLive) {
        if (!cur.next_visit_at || new Date(cur.next_visit_at).getTime() > time) {
          cur.next_visit_at = r.scheduled_at;
        }
      }
    }
  }
  return Array.from(byPatient.values()).sort((a, b) => {
    const ax = new Date(a.next_visit_at ?? a.last_visit_at ?? 0).getTime();
    const bx = new Date(b.next_visit_at ?? b.last_visit_at ?? 0).getTime();
    return bx - ax;
  });
}

export async function getPatientForDoctor(patientId: string): Promise<{
  profile: Profile | null;
  medical: PatientProfile | null;
} | null> {
  const sb = requireClient();
  const [profileRes, medicalRes] = await Promise.all([
    sb.from('profiles').select('*').eq('id', patientId).maybeSingle(),
    sb.from('patient_profiles').select('*').eq('id', patientId).maybeSingle(),
  ]);
  if (profileRes.error) throw profileRes.error;
  if (medicalRes.error) throw medicalRes.error;
  return {
    profile: (profileRes.data as unknown as Profile) ?? null,
    medical: (medicalRes.data as unknown as PatientProfile) ?? null,
  };
}
