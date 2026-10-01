import { supabase } from '@/lib/supabase';
import type {
  AccountStatus, Appointment, AppointmentStatus, DoctorProfile,
  PatientProfile, Profile, Report, ReportStatus, UserRole,
} from '@/types';

const requireClient = () => {
  if (!supabase) throw new Error('Supabase client is not configured.');
  return supabase;
};

// -- Aggregate stats -------------------------------------------------------

export interface PlatformStats {
  patients: number;
  doctors: number;
  doctorsPending: number;
  appointmentsTotal: number;
  appointmentsThisWeek: number;
  openReports: number;
  /** counts of appointment statuses over ALL time */
  statusBreakdown: Record<AppointmentStatus, number>;
  /** per-day appointment counts for the last 30 days (oldest → newest) */
  perDay: Array<{ date: string; count: number }>;
}

export async function getPlatformStats(): Promise<PlatformStats> {
  const sb = requireClient();
  const startOfWeek = new Date();
  startOfWeek.setHours(0, 0, 0, 0);
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());

  const since30d = new Date();
  since30d.setDate(since30d.getDate() - 29);
  since30d.setHours(0, 0, 0, 0);

  const [
    patientsRes, doctorsRes, doctorsPendingRes,
    apptsTotalRes, apptsWeekRes, openReportsRes,
    apptsForBreakdownRes, apptsRecentRes,
  ] = await Promise.all([
    sb.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'patient'),
    sb.from('doctor_profiles').select('id', { count: 'exact', head: true }).eq('is_verified', true),
    sb.from('doctor_profiles').select('id', { count: 'exact', head: true }).eq('is_verified', false),
    sb.from('appointments').select('id', { count: 'exact', head: true }),
    sb.from('appointments').select('id', { count: 'exact', head: true }).gte('scheduled_at', startOfWeek.toISOString()),
    sb.from('reports').select('id', { count: 'exact', head: true }).eq('status', 'open'),
    sb.from('appointments').select('status'),
    sb.from('appointments').select('scheduled_at').gte('scheduled_at', since30d.toISOString()),
  ]);

  const errs = [patientsRes, doctorsRes, doctorsPendingRes, apptsTotalRes, apptsWeekRes, openReportsRes, apptsForBreakdownRes, apptsRecentRes]
    .map((r) => r.error).filter(Boolean);
  if (errs.length) throw errs[0];

  const statusBreakdown: Record<AppointmentStatus, number> = {
    pending: 0, confirmed: 0, cancelled: 0, completed: 0, rejected: 0,
  };
  for (const r of (apptsForBreakdownRes.data ?? []) as { status: AppointmentStatus }[]) {
    statusBreakdown[r.status] = (statusBreakdown[r.status] ?? 0) + 1;
  }

  // Bucket by local day
  const dayBuckets = new Map<string, number>();
  for (let i = 0; i < 30; i++) {
    const d = new Date(since30d);
    d.setDate(since30d.getDate() + i);
    dayBuckets.set(d.toISOString().slice(0, 10), 0);
  }
  for (const r of (apptsRecentRes.data ?? []) as { scheduled_at: string }[]) {
    const key = new Date(r.scheduled_at).toISOString().slice(0, 10);
    if (dayBuckets.has(key)) dayBuckets.set(key, (dayBuckets.get(key) ?? 0) + 1);
  }

  return {
    patients: patientsRes.count ?? 0,
    doctors: doctorsRes.count ?? 0,
    doctorsPending: doctorsPendingRes.count ?? 0,
    appointmentsTotal: apptsTotalRes.count ?? 0,
    appointmentsThisWeek: apptsWeekRes.count ?? 0,
    openReports: openReportsRes.count ?? 0,
    statusBreakdown,
    perDay: Array.from(dayBuckets.entries()).map(([date, count]) => ({ date, count })),
  };
}

// -- Doctors ---------------------------------------------------------------

export interface AdminDoctorRow extends DoctorProfile {
  profile: Pick<Profile, 'id' | 'full_name' | 'avatar_url' | 'status' | 'created_at'>;
}

export async function listAdminDoctors(filter?: 'all' | 'verified' | 'pending' | 'suspended'): Promise<AdminDoctorRow[]> {
  const sb = requireClient();
  let q = sb
    .from('doctor_profiles')
    .select(`
      *,
      profile:profiles!doctor_profiles_id_fkey(id, full_name, avatar_url, status, created_at)
    `);
  if (filter === 'verified') q = q.eq('is_verified', true);
  if (filter === 'pending')  q = q.eq('is_verified', false);
  const { data, error } = await q;
  if (error) throw error;
  const rows = (data ?? []) as unknown as AdminDoctorRow[];
  if (filter === 'suspended') return rows.filter((r) => r.profile?.status === 'suspended');
  return rows;
}

export async function verifyDoctor(id: string): Promise<void> {
  const sb = requireClient();
  const { error } = await sb.from('doctor_profiles').update({ is_verified: true }).eq('id', id);
  if (error) throw error;
}

export async function unverifyDoctor(id: string): Promise<void> {
  const sb = requireClient();
  const { error } = await sb.from('doctor_profiles').update({ is_verified: false }).eq('id', id);
  if (error) throw error;
}

// -- Patients --------------------------------------------------------------

export interface AdminPatientRow {
  profile: Profile;
  medical: PatientProfile | null;
  appointment_count: number;
}

export async function listAdminPatients(): Promise<AdminPatientRow[]> {
  const sb = requireClient();
  const [profRes, apptsRes] = await Promise.all([
    sb.from('profiles').select('*').eq('role', 'patient'),
    sb.from('appointments').select('patient_id'),
  ]);
  if (profRes.error) throw profRes.error;
  if (apptsRes.error) throw apptsRes.error;
  const counts = new Map<string, number>();
  for (const r of (apptsRes.data ?? []) as { patient_id: string }[]) {
    counts.set(r.patient_id, (counts.get(r.patient_id) ?? 0) + 1);
  }
  return ((profRes.data ?? []) as unknown as Profile[]).map((p) => ({
    profile: p,
    medical: null,
    appointment_count: counts.get(p.id) ?? 0,
  }));
}

// -- Account status update (works for both patients and doctors) ----------

export async function setAccountStatus(id: string, status: AccountStatus): Promise<void> {
  const sb = requireClient();
  const { error } = await sb.from('profiles').update({ status }).eq('id', id);
  if (error) throw error;
}

// -- Appointments oversight -----------------------------------------------

export interface AdminAppointmentRow extends Appointment {
  patient: Pick<Profile, 'id' | 'full_name' | 'avatar_url'> | null;
  doctor:  Pick<Profile, 'id' | 'full_name' | 'avatar_url'> | null;
}

export async function listAdminAppointments(): Promise<AdminAppointmentRow[]> {
  const sb = requireClient();
  const { data, error } = await sb
    .from('appointments')
    .select(`
      *,
      patient:profiles!appointments_patient_id_fkey(id, full_name, avatar_url),
      doctor:profiles!appointments_doctor_id_fkey(id, full_name, avatar_url)
    `)
    .order('scheduled_at', { ascending: false })
    .limit(200);
  if (error) throw error;
  return (data ?? []) as unknown as AdminAppointmentRow[];
}

// -- Reports queue --------------------------------------------------------

export interface AdminReport extends Report {
  reporter: Pick<Profile, 'id' | 'full_name' | 'role'> | null;
}

export async function listAdminReports(status: ReportStatus = 'open'): Promise<AdminReport[]> {
  const sb = requireClient();
  const { data, error } = await sb
    .from('reports')
    .select(`
      *,
      reporter:profiles!reports_reporter_id_fkey(id, full_name, role)
    `)
    .eq('status', status)
    .order('priority', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as AdminReport[];
}

export async function resolveReport(id: string, note?: string): Promise<void> {
  const sb = requireClient();
  const { error } = await sb
    .from('reports')
    .update({ status: 'resolved', resolved_at: new Date().toISOString(), resolution_note: note ?? null })
    .eq('id', id);
  if (error) throw error;
}

export async function dismissReport(id: string, note?: string): Promise<void> {
  const sb = requireClient();
  const { error } = await sb
    .from('reports')
    .update({ status: 'dismissed', resolved_at: new Date().toISOString(), resolution_note: note ?? null })
    .eq('id', id);
  if (error) throw error;
}

// -- User details (for the details drawer) --------------------------------

export interface AdminUserDetail {
  profile: Profile;
  doctor: DoctorProfile | null;
  patient: PatientProfile | null;
  appointment_count: number;
  reports_filed: number;
  reports_against: number;
}

export async function getAdminUserDetail(id: string): Promise<AdminUserDetail | null> {
  const sb = requireClient();
  const [pRes, dRes, patRes, apptsRes, filedRes] = await Promise.all([
    sb.from('profiles').select('*').eq('id', id).maybeSingle(),
    sb.from('doctor_profiles').select('*').eq('id', id).maybeSingle(),
    sb.from('patient_profiles').select('*').eq('id', id).maybeSingle(),
    sb.from('appointments').select('id', { count: 'exact', head: true }).or(`patient_id.eq.${id},doctor_id.eq.${id}`),
    sb.from('reports').select('id', { count: 'exact', head: true }).eq('reporter_id', id),
  ]);
  if (pRes.error || !pRes.data) return null;
  return {
    profile: pRes.data as unknown as Profile,
    doctor:  (dRes.data as unknown as DoctorProfile | null) ?? null,
    patient: (patRes.data as unknown as PatientProfile | null) ?? null,
    appointment_count: apptsRes.count ?? 0,
    reports_filed: filedRes.count ?? 0,
    reports_against: 0, // Would need target_id filtering; kept simple.
  };
}

// -- Bulk role change (admin promoting doctors etc.) ---------------------

export async function setUserRole(id: string, role: UserRole): Promise<void> {
  if (role === 'admin') {
    const sb = requireClient();
    const { error } = await sb.rpc('promote_to_admin', { _target_user: id });
    if (error) throw error;
    return;
  }
  const sb = requireClient();
  const { error } = await sb.from('profiles').update({ role }).eq('id', id);
  if (error) throw error;
}
