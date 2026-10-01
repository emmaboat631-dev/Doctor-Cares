import { supabase } from '@/lib/supabase';
import type { Profile } from '@/types';

const requireClient = () => {
  if (!supabase) throw new Error('Supabase client is not configured.');
  return supabase;
};

export type ReferralStatus = 'pending' | 'accepted' | 'declined' | 'completed';

export interface Referral {
  id: string;
  patient_id: string;
  from_doctor_id: string;
  to_doctor_id: string;
  reason: string;
  notes: string | null;
  status: ReferralStatus;
  responded_at: string | null;
  created_at: string;
  updated_at: string;
  patient?:    Pick<Profile, 'id' | 'full_name' | 'avatar_url'> | null;
  from_doctor?: Pick<Profile, 'id' | 'full_name' | 'avatar_url'> | null;
  to_doctor?:   Pick<Profile, 'id' | 'full_name' | 'avatar_url'> | null;
}

const JOIN = `
  *,
  patient:profiles!referrals_patient_id_fkey(id, full_name, avatar_url),
  from_doctor:profiles!referrals_from_doctor_id_fkey(id, full_name, avatar_url),
  to_doctor:profiles!referrals_to_doctor_id_fkey(id, full_name, avatar_url)
`;

export async function listPatientReferrals(patientId: string): Promise<Referral[]> {
  const sb = requireClient();
  const { data, error } = await sb
    .from('referrals')
    .select(JOIN)
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as Referral[];
}

export async function listIncomingReferrals(toDoctorId: string): Promise<Referral[]> {
  const sb = requireClient();
  const { data, error } = await sb
    .from('referrals')
    .select(JOIN)
    .eq('to_doctor_id', toDoctorId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as Referral[];
}

export async function listOutgoingReferrals(fromDoctorId: string): Promise<Referral[]> {
  const sb = requireClient();
  const { data, error } = await sb
    .from('referrals')
    .select(JOIN)
    .eq('from_doctor_id', fromDoctorId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as Referral[];
}

export async function createReferral(params: {
  patientId: string;
  fromDoctorId: string;
  toDoctorId: string;
  reason: string;
  notes?: string | null;
}): Promise<Referral> {
  const sb = requireClient();
  const { data, error } = await sb
    .from('referrals')
    .insert({
      patient_id: params.patientId,
      from_doctor_id: params.fromDoctorId,
      to_doctor_id: params.toDoctorId,
      reason: params.reason,
      notes: params.notes ?? null,
    })
    .select(JOIN)
    .single();
  if (error) throw error;
  return data as unknown as Referral;
}

export async function updateReferralStatus(id: string, status: ReferralStatus): Promise<Referral> {
  const sb = requireClient();
  const { data, error } = await sb
    .from('referrals')
    .update({ status })
    .eq('id', id)
    .select(JOIN)
    .single();
  if (error) throw error;
  return data as unknown as Referral;
}

export async function cancelReferral(id: string): Promise<void> {
  const sb = requireClient();
  const { error } = await sb.from('referrals').delete().eq('id', id);
  if (error) throw error;
}

export const STATUS_LABEL: Record<ReferralStatus, string> = {
  pending: 'Pending',
  accepted: 'Accepted',
  declined: 'Declined',
  completed: 'Completed',
};

export const STATUS_TONE: Record<ReferralStatus, 'warning' | 'success' | 'danger' | 'info'> = {
  pending: 'warning',
  accepted: 'success',
  declined: 'danger',
  completed: 'info',
};
