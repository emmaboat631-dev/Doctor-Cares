import { supabase } from '@/lib/supabase';

const requireClient = () => {
  if (!supabase) throw new Error('Supabase client is not configured.');
  return supabase;
};

export type MetricType = 'heart_rate' | 'bp' | 'temperature' | 'weight' | 'glucose' | 'spo2';

export interface HealthMetric {
  id: string;
  user_id: string;
  type: MetricType;
  value: number;
  value2: number | null;
  unit: string;
  taken_at: string;
  notes: string | null;
  created_at: string;
}

/** Config for each metric kind — unit, display, sensible range for a quick
 *  "normal/high/low" badge. Kept in one place so UI stays consistent. */
export const METRIC_SPEC: Record<MetricType, {
  label: string;
  unit: string;
  dualValue?: boolean;      // true for bp
  normal: (v: number, v2?: number | null) => 'low' | 'normal' | 'high';
}> = {
  heart_rate: {
    label: 'Heart rate', unit: 'bpm',
    normal: (v) => v < 60 ? 'low' : v > 100 ? 'high' : 'normal',
  },
  bp: {
    label: 'Blood pressure', unit: 'mmHg', dualValue: true,
    normal: (sys, dia) => {
      if (sys >= 140 || (dia ?? 0) >= 90) return 'high';
      if (sys < 90 || (dia ?? 0) < 60)    return 'low';
      return 'normal';
    },
  },
  temperature: {
    label: 'Temperature', unit: '°C',
    normal: (v) => v < 36 ? 'low' : v > 37.5 ? 'high' : 'normal',
  },
  weight: {
    label: 'Weight', unit: 'kg',
    normal: () => 'normal',
  },
  glucose: {
    label: 'Glucose', unit: 'mg/dL',
    normal: (v) => v < 70 ? 'low' : v > 140 ? 'high' : 'normal',
  },
  spo2: {
    label: 'SpO₂', unit: '%',
    normal: (v) => v < 95 ? 'low' : 'normal',
  },
};

export function formatMetric(m: Pick<HealthMetric, 'type' | 'value' | 'value2'>): string {
  if (m.type === 'bp' && m.value2 != null) return `${m.value}/${m.value2}`;
  return String(m.value);
}

/** Latest reading of each type for the given user. Returns a map. */
export async function latestMetricsByType(userId: string): Promise<Partial<Record<MetricType, HealthMetric>>> {
  const sb = requireClient();
  // DISTINCT ON isn't exposed via supabase-js; fetch recent and reduce.
  const { data, error } = await sb
    .from('health_metrics')
    .select('*')
    .eq('user_id', userId)
    .order('taken_at', { ascending: false })
    .limit(100);
  if (error) throw error;
  const out: Partial<Record<MetricType, HealthMetric>> = {};
  for (const row of (data ?? []) as HealthMetric[]) {
    if (!out[row.type]) out[row.type] = row;
  }
  return out;
}

/** Time-series for one metric (newest first). */
export async function listMetrics(userId: string, type: MetricType, limit = 50): Promise<HealthMetric[]> {
  const sb = requireClient();
  const { data, error } = await sb
    .from('health_metrics')
    .select('*')
    .eq('user_id', userId)
    .eq('type', type)
    .order('taken_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as HealthMetric[];
}

export async function logMetric(params: {
  userId: string;
  type: MetricType;
  value: number;
  value2?: number | null;
  takenAt?: string;
  notes?: string | null;
}): Promise<HealthMetric> {
  const sb = requireClient();
  const spec = METRIC_SPEC[params.type];
  const { data, error } = await sb
    .from('health_metrics')
    .insert({
      user_id: params.userId,
      type: params.type,
      value: params.value,
      value2: params.value2 ?? null,
      unit: spec.unit,
      taken_at: params.takenAt ?? new Date().toISOString(),
      notes: params.notes ?? null,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data as HealthMetric;
}

export async function deleteMetric(id: string): Promise<void> {
  const sb = requireClient();
  const { error } = await sb.from('health_metrics').delete().eq('id', id);
  if (error) throw error;
}
