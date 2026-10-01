import { supabase } from '@/lib/supabase';
import type { DoctorAvailability, DoctorBlockedDate } from '@/types';

const requireClient = () => {
  if (!supabase) throw new Error('Supabase client is not configured.');
  return supabase;
};

export async function getAvailability(doctorId: string): Promise<DoctorAvailability[]> {
  const sb = requireClient();
  const { data, error } = await sb
    .from('doctor_availability')
    .select('*')
    .eq('doctor_id', doctorId)
    .order('weekday', { ascending: true })
    .order('start_time', { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as DoctorAvailability[];
}

export async function getBlockedDates(doctorId: string): Promise<DoctorBlockedDate[]> {
  const sb = requireClient();
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await sb
    .from('doctor_blocked_dates')
    .select('*')
    .eq('doctor_id', doctorId)
    .gte('end_date', today);
  if (error) throw error;
  return (data ?? []) as unknown as DoctorBlockedDate[];
}

// -- Availability CRUD (doctor self-service) -------------------------------

export interface AvailabilityInput {
  doctor_id: string;
  weekday: number;
  start_time: string;   // HH:MM
  end_time: string;
  slot_minutes: number;
}

export async function addAvailability(input: AvailabilityInput): Promise<void> {
  const sb = requireClient();
  const { error } = await sb.from('doctor_availability').insert(input);
  if (error) throw error;
}

export async function deleteAvailability(id: string): Promise<void> {
  const sb = requireClient();
  const { error } = await sb.from('doctor_availability').delete().eq('id', id);
  if (error) throw error;
}

export async function updateSlotMinutesForAll(doctorId: string, slotMinutes: number): Promise<void> {
  const sb = requireClient();
  const { error } = await sb
    .from('doctor_availability')
    .update({ slot_minutes: slotMinutes })
    .eq('doctor_id', doctorId);
  if (error) throw error;
}

export interface BlockedInput {
  doctor_id: string;
  start_date: string;
  end_date: string;
  reason?: string | null;
}

export async function addBlockedDate(input: BlockedInput): Promise<void> {
  const sb = requireClient();
  const { error } = await sb.from('doctor_blocked_dates').insert({
    doctor_id: input.doctor_id,
    start_date: input.start_date,
    end_date: input.end_date,
    reason: input.reason ?? null,
  });
  if (error) throw error;
}

export async function deleteBlockedDate(id: string): Promise<void> {
  const sb = requireClient();
  const { error } = await sb.from('doctor_blocked_dates').delete().eq('id', id);
  if (error) throw error;
}

/** Fetch scheduled appointments for the doctor on a given local date. */
export async function getDoctorBookings(doctorId: string, date: Date): Promise<Array<{ scheduled_at: string; duration_minutes: number }>> {
  const sb = requireClient();
  const start = new Date(date); start.setHours(0, 0, 0, 0);
  const end = new Date(date);   end.setHours(23, 59, 59, 999);
  const { data, error } = await sb
    .from('appointments')
    .select('scheduled_at, duration_minutes, status')
    .eq('doctor_id', doctorId)
    .in('status', ['pending', 'confirmed'])
    .gte('scheduled_at', start.toISOString())
    .lte('scheduled_at', end.toISOString());
  if (error) throw error;
  return (data ?? []) as unknown as Array<{ scheduled_at: string; duration_minutes: number }>;
}

// ---------------------------------------------------------------------------
// Pure helpers — testable without a live client
// ---------------------------------------------------------------------------

const isoDate = (d: Date) => d.toISOString().slice(0, 10);

const parseTime = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};

const dateWithMinutes = (day: Date, minutesOfDay: number): Date => {
  const d = new Date(day);
  d.setHours(0, 0, 0, 0);
  d.setMinutes(minutesOfDay);
  return d;
};

const isDateBlocked = (day: Date, blocked: DoctorBlockedDate[]): boolean => {
  const iso = isoDate(day);
  return blocked.some((b) => iso >= b.start_date && iso <= b.end_date);
};

export interface SlotOption {
  /** ISO timestamp — pass to createAppointment as scheduled_at */
  iso: string;
  /** Display label, HH:MM 24h */
  label: string;
  /** True if the slot conflicts with an existing appointment or is in the past. */
  taken: boolean;
}

/**
 * Given a doctor's weekly windows, blocked dates and existing bookings for
 * the target day, produce the list of bookable time slots.
 */
export function computeSlots(params: {
  day: Date;
  availability: DoctorAvailability[];
  blocked: DoctorBlockedDate[];
  bookings: Array<{ scheduled_at: string; duration_minutes: number }>;
  slotMinutesOverride?: number;
}): SlotOption[] {
  const { day, availability, blocked, bookings } = params;

  if (isDateBlocked(day, blocked)) return [];

  const weekday = day.getDay(); // 0=Sun..6=Sat — matches SQL enum
  const windows = availability.filter((w) => w.weekday === weekday);
  if (windows.length === 0) return [];

  const now = Date.now();

  // Precompute booked ranges (in ms) to detect conflicts.
  const bookedRanges = bookings.map((b) => {
    const start = new Date(b.scheduled_at).getTime();
    const end = start + b.duration_minutes * 60_000;
    return { start, end };
  });

  const slots: SlotOption[] = [];
  for (const w of windows) {
    const slotMinutes = params.slotMinutesOverride ?? w.slot_minutes;
    const startMin = parseTime(w.start_time);
    const endMin = parseTime(w.end_time);
    for (let t = startMin; t + slotMinutes <= endMin; t += slotMinutes) {
      const when = dateWithMinutes(day, t);
      const iso = when.toISOString();
      const label = `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
      const slotStart = when.getTime();
      const slotEnd = slotStart + slotMinutes * 60_000;
      const inPast = slotEnd <= now;
      const conflict = bookedRanges.some((b) => slotStart < b.end && slotEnd > b.start);
      slots.push({ iso, label, taken: inPast || conflict });
    }
  }
  return slots;
}

/** Small utility: the 7 upcoming date pills (today .. today+6). */
export function nextSevenDays(from: Date = new Date()): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(from);
    d.setDate(from.getDate() + i);
    d.setHours(0, 0, 0, 0);
    return d;
  });
}
