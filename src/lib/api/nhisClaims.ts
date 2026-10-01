import { supabase } from '@/lib/supabase';
import type { Profile } from '@/types';

const requireClient = () => {
  if (!supabase) throw new Error('Supabase client is not configured.');
  return supabase;
};

export type ClaimStatus = 'draft' | 'submitted' | 'approved' | 'rejected' | 'paid';

export interface NhisClaim {
  id: string;
  appointment_id: string;
  patient_id: string;
  doctor_id: string;
  nhis_number: string;
  diagnosis: string | null;
  services: string | null;
  amount: number;
  status: ClaimStatus;
  admin_notes: string | null;
  submitted_at: string | null;
  decided_at: string | null;
  created_at: string;
  updated_at: string;
  patient?: Pick<Profile, 'id' | 'full_name' | 'avatar_url'> | null;
  doctor?:  Pick<Profile, 'id' | 'full_name' | 'avatar_url'> | null;
}

const JOIN = `
  *,
  patient:profiles!nhis_claims_patient_id_fkey(id, full_name, avatar_url),
  doctor:profiles!nhis_claims_doctor_id_fkey(id, full_name, avatar_url)
`;

export const STATUS_LABEL: Record<ClaimStatus, string> = {
  draft: 'Draft', submitted: 'Submitted', approved: 'Approved', rejected: 'Rejected', paid: 'Paid',
};

export const STATUS_TONE: Record<ClaimStatus, 'neutral' | 'warning' | 'success' | 'danger' | 'info'> = {
  draft: 'neutral', submitted: 'warning', approved: 'success', rejected: 'danger', paid: 'info',
};

export async function listPatientClaims(patientId: string): Promise<NhisClaim[]> {
  const sb = requireClient();
  const { data, error } = await sb
    .from('nhis_claims').select(JOIN).eq('patient_id', patientId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as NhisClaim[];
}

export async function listDoctorClaims(doctorId: string): Promise<NhisClaim[]> {
  const sb = requireClient();
  const { data, error } = await sb
    .from('nhis_claims').select(JOIN).eq('doctor_id', doctorId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as NhisClaim[];
}

export async function listAllClaims(status?: ClaimStatus): Promise<NhisClaim[]> {
  const sb = requireClient();
  let q = sb.from('nhis_claims').select(JOIN).order('created_at', { ascending: false }).limit(200);
  if (status) q = q.eq('status', status);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as unknown as NhisClaim[];
}

export async function getClaimForAppointment(appointmentId: string): Promise<NhisClaim | null> {
  const sb = requireClient();
  const { data, error } = await sb
    .from('nhis_claims').select('*').eq('appointment_id', appointmentId).maybeSingle();
  if (error) throw error;
  return (data as NhisClaim | null) ?? null;
}

export async function createClaim(params: {
  appointmentId: string;
  patientId: string;
  doctorId: string;
  nhisNumber: string;
  diagnosis?: string | null;
  services?: string | null;
  amount: number;
  submit?: boolean;
}): Promise<NhisClaim> {
  const sb = requireClient();
  const { data, error } = await sb
    .from('nhis_claims')
    .insert({
      appointment_id: params.appointmentId,
      patient_id: params.patientId,
      doctor_id: params.doctorId,
      nhis_number: params.nhisNumber,
      diagnosis: params.diagnosis ?? null,
      services: params.services ?? null,
      amount: params.amount,
      status: params.submit ? 'submitted' : 'draft',
      submitted_at: params.submit ? new Date().toISOString() : null,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data as NhisClaim;
}

export async function updateClaimStatus(id: string, status: ClaimStatus, adminNotes?: string): Promise<NhisClaim> {
  const sb = requireClient();
  const patch: Record<string, unknown> = { status };
  if (adminNotes !== undefined) patch.admin_notes = adminNotes;
  const { data, error } = await sb.from('nhis_claims').update(patch).eq('id', id).select('*').single();
  if (error) throw error;
  return data as NhisClaim;
}
