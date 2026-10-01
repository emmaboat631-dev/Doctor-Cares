import { supabase } from '@/lib/supabase';
import type { Profile } from '@/types';

const requireClient = () => {
  if (!supabase) throw new Error('Supabase client is not configured.');
  return supabase;
};

export interface Review {
  id: string;
  appointment_id: string;
  doctor_id: string;
  patient_id: string;
  rating: number;
  body: string | null;
  created_at: string;
  patient?: Pick<Profile, 'id' | 'full_name' | 'avatar_url'> | null;
}

export async function listDoctorReviews(doctorId: string, limit = 25): Promise<Review[]> {
  const sb = requireClient();
  const { data, error } = await sb
    .from('reviews')
    .select(`
      id, appointment_id, doctor_id, patient_id, rating, body, created_at,
      patient:profiles!reviews_patient_id_fkey(id, full_name, avatar_url)
    `)
    .eq('doctor_id', doctorId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as unknown as Review[];
}

export async function getMyReviewFor(appointmentId: string, patientId: string): Promise<Review | null> {
  const sb = requireClient();
  const { data, error } = await sb
    .from('reviews')
    .select('*')
    .eq('appointment_id', appointmentId)
    .eq('patient_id', patientId)
    .maybeSingle();
  if (error) throw error;
  return (data as unknown as Review) ?? null;
}

export async function createReview(params: {
  appointmentId: string;
  doctorId: string;
  patientId: string;
  rating: number;
  body?: string | null;
}): Promise<Review> {
  const sb = requireClient();
  const { data, error } = await sb
    .from('reviews')
    .insert({
      appointment_id: params.appointmentId,
      doctor_id: params.doctorId,
      patient_id: params.patientId,
      rating: params.rating,
      body: params.body ?? null,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data as unknown as Review;
}
