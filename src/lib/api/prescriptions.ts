import { supabase } from '@/lib/supabase';
import type { Profile } from '@/types';

const requireClient = () => {
  if (!supabase) throw new Error('Supabase client is not configured.');
  return supabase;
};

export interface Medication {
  name: string;
  dosage: string;        // "500 mg"
  frequency: string;     // "twice daily"
  duration: string;      // "7 days"
  instructions?: string; // "after meals"
}

export interface Prescription {
  id: string;
  patient_id: string;
  doctor_id: string;
  appointment_id: string | null;
  medications: Medication[];
  diagnosis: string | null;
  notes: string | null;
  issued_at: string;
  created_at: string;
  updated_at: string;
  patient?: Pick<Profile, 'id' | 'full_name' | 'avatar_url'> | null;
  doctor?:  Pick<Profile, 'id' | 'full_name' | 'avatar_url'> | null;
}

const JOIN = `
  *,
  patient:profiles!prescriptions_patient_id_fkey(id, full_name, avatar_url),
  doctor:profiles!prescriptions_doctor_id_fkey(id, full_name, avatar_url)
`;

export async function listPatientPrescriptions(patientId: string): Promise<Prescription[]> {
  const sb = requireClient();
  const { data, error } = await sb
    .from('prescriptions').select(JOIN).eq('patient_id', patientId)
    .order('issued_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as Prescription[];
}

export async function listDoctorPrescriptions(doctorId: string): Promise<Prescription[]> {
  const sb = requireClient();
  const { data, error } = await sb
    .from('prescriptions').select(JOIN).eq('doctor_id', doctorId)
    .order('issued_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as Prescription[];
}

export async function listPrescriptionsForAppointment(appointmentId: string): Promise<Prescription[]> {
  const sb = requireClient();
  const { data, error } = await sb
    .from('prescriptions').select(JOIN).eq('appointment_id', appointmentId)
    .order('issued_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as Prescription[];
}

export async function getPrescription(id: string): Promise<Prescription | null> {
  const sb = requireClient();
  const { data, error } = await sb
    .from('prescriptions').select(JOIN).eq('id', id).maybeSingle();
  if (error) throw error;
  return (data as unknown as Prescription | null) ?? null;
}

export async function createPrescription(params: {
  patientId: string;
  doctorId: string;
  appointmentId?: string | null;
  medications: Medication[];
  diagnosis?: string | null;
  notes?: string | null;
}): Promise<Prescription> {
  const sb = requireClient();
  const { data, error } = await sb
    .from('prescriptions')
    .insert({
      patient_id: params.patientId,
      doctor_id: params.doctorId,
      appointment_id: params.appointmentId ?? null,
      medications: params.medications,
      diagnosis: params.diagnosis ?? null,
      notes: params.notes ?? null,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data as Prescription;
}

export async function deletePrescription(id: string): Promise<void> {
  const sb = requireClient();
  const { error } = await sb.from('prescriptions').delete().eq('id', id);
  if (error) throw error;
}
