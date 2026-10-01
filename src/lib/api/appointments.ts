import { supabase } from '@/lib/supabase';
import type { Appointment, AppointmentMode, AppointmentStatus, DoctorProfile, Profile } from '@/types';

const requireClient = () => {
  if (!supabase) throw new Error('Supabase client is not configured.');
  return supabase;
};

export interface AppointmentWithDoctor extends Appointment {
  doctor: Pick<Profile, 'id' | 'full_name' | 'avatar_url'> & { doctor_profile?: Pick<DoctorProfile, 'specialty' | 'consultation_fee'> | null };
}

export interface AppointmentWithPatient extends Appointment {
  patient: Pick<Profile, 'id' | 'full_name' | 'avatar_url'>;
}

// -- Patient side -----------------------------------------------------------

export async function listPatientAppointments(patientId: string): Promise<AppointmentWithDoctor[]> {
  const sb = requireClient();
  const { data, error } = await sb
    .from('appointments')
    .select(`
      *,
      doctor:profiles!appointments_doctor_id_fkey(
        id, full_name, avatar_url,
        doctor_profile:doctor_profiles(specialty, consultation_fee)
      )
    `)
    .eq('patient_id', patientId)
    .order('scheduled_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as AppointmentWithDoctor[];
}

export async function getAppointmentForPatient(id: string): Promise<AppointmentWithDoctor | null> {
  const sb = requireClient();
  const { data, error } = await sb
    .from('appointments')
    .select(`
      *,
      doctor:profiles!appointments_doctor_id_fkey(
        id, full_name, avatar_url,
        doctor_profile:doctor_profiles(specialty, consultation_fee)
      )
    `)
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return (data as unknown as AppointmentWithDoctor | null);
}

export interface CreateAppointmentInput {
  patient_id: string;
  doctor_id: string;
  scheduled_at: string; // ISO
  duration_minutes?: number;
  mode?: AppointmentMode;
  reason?: string | null;
  fee?: number | null;
}

export async function createAppointment(input: CreateAppointmentInput): Promise<Appointment> {
  const sb = requireClient();
  const { data, error } = await sb
    .from('appointments')
    .insert({
      patient_id: input.patient_id,
      doctor_id: input.doctor_id,
      scheduled_at: input.scheduled_at,
      duration_minutes: input.duration_minutes ?? 30,
      mode: input.mode ?? 'video',
      reason: input.reason ?? null,
      fee: input.fee ?? null,
      status: 'pending',
    })
    .select('*')
    .single();
  if (error) throw error;
  return data as unknown as Appointment;
}

export async function cancelAppointment(id: string, reason?: string): Promise<void> {
  const sb = requireClient();
  const { error } = await sb
    .from('appointments')
    .update({
      status: 'cancelled' as AppointmentStatus,
      cancelled_at: new Date().toISOString(),
      cancel_reason: reason ?? null,
    })
    .eq('id', id);
  if (error) throw error;
}

// -- Doctor side status updates --------------------------------------------

export async function setAppointmentStatus(
  id: string,
  status: AppointmentStatus,
  extra: { cancel_reason?: string | null } = {},
): Promise<void> {
  const sb = requireClient();
  const patch: Record<string, unknown> = { status };
  if (status === 'cancelled' || status === 'rejected') {
    patch.cancelled_at = new Date().toISOString();
    if (extra.cancel_reason != null) patch.cancel_reason = extra.cancel_reason;
  }
  const { error } = await sb.from('appointments').update(patch).eq('id', id);
  if (error) throw error;
}

export async function updateDoctorNotes(id: string, notes: string | null): Promise<void> {
  const sb = requireClient();
  const { error } = await sb.from('appointments').update({ doctor_notes: notes }).eq('id', id);
  if (error) throw error;
}

export async function getAppointmentForDoctor(id: string): Promise<AppointmentWithPatient | null> {
  const sb = requireClient();
  const { data, error } = await sb
    .from('appointments')
    .select(`
      *,
      patient:profiles!appointments_patient_id_fkey(id, full_name, avatar_url)
    `)
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return (data as unknown as AppointmentWithPatient | null);
}

/**
 * Aggregate counts for the doctor dashboard.
 * Uses today (local midnight) as the day boundary.
 */
export async function getDoctorTodayStats(doctorId: string): Promise<{
  today: number; pending: number; week: number;
}> {
  const sb = requireClient();
  const now = new Date();
  const startOfToday = new Date(now); startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(now);   endOfToday.setHours(23, 59, 59, 999);
  const startOfWeek = new Date(startOfToday);
  startOfWeek.setDate(startOfToday.getDate() - startOfToday.getDay()); // Sunday start
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 7);

  const [today, pending, week] = await Promise.all([
    sb.from('appointments').select('id', { count: 'exact', head: true })
      .eq('doctor_id', doctorId)
      .gte('scheduled_at', startOfToday.toISOString())
      .lte('scheduled_at', endOfToday.toISOString())
      .in('status', ['pending', 'confirmed', 'completed']),
    sb.from('appointments').select('id', { count: 'exact', head: true })
      .eq('doctor_id', doctorId).eq('status', 'pending'),
    sb.from('appointments').select('id', { count: 'exact', head: true })
      .eq('doctor_id', doctorId)
      .gte('scheduled_at', startOfWeek.toISOString())
      .lt('scheduled_at', endOfWeek.toISOString())
      .in('status', ['pending', 'confirmed', 'completed']),
  ]);

  return {
    today: today.count ?? 0,
    pending: pending.count ?? 0,
    week: week.count ?? 0,
  };
}

// -- Doctor side (used later in Phase 5) -----------------------------------

export async function listDoctorAppointments(doctorId: string): Promise<AppointmentWithPatient[]> {
  const sb = requireClient();
  const { data, error } = await sb
    .from('appointments')
    .select(`
      *,
      patient:profiles!appointments_patient_id_fkey(id, full_name, avatar_url)
    `)
    .eq('doctor_id', doctorId)
    .order('scheduled_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as AppointmentWithPatient[];
}
