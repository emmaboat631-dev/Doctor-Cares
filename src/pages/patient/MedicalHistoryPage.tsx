import { useEffect, useState, type FormEvent, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useAuth } from '@/contexts/AuthContext';
import { useAsync } from '@/hooks/useAsync';
import { getPatientProfile, updatePatientProfile } from '@/lib/api/profile';
import { cn } from '@/lib/cn';

type SmokingStatus = 'never' | 'former' | 'current';
type AlcoholUse = 'none' | 'occasional' | 'regular' | 'heavy';

const SMOKING_OPTIONS: { v: SmokingStatus; label: string }[] = [
  { v: 'never',   label: 'Never' },
  { v: 'former',  label: 'Former' },
  { v: 'current', label: 'Current' },
];

const ALCOHOL_OPTIONS: { v: AlcoholUse; label: string }[] = [
  { v: 'none',        label: 'None' },
  { v: 'occasional',  label: 'Occasional' },
  { v: 'regular',     label: 'Regular' },
  { v: 'heavy',       label: 'Heavy' },
];

export function MedicalHistoryPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const patient = useAsync(() => (user ? getPatientProfile(user.id) : Promise.resolve(null)), [user?.id]);

  const [heightCm, setHeightCm]       = useState('');
  const [conditions, setConditions]   = useState<string[]>([]);
  const [medications, setMedications] = useState<string[]>([]);
  const [immunizations, setImmunizations] = useState<string[]>([]);
  const [surgeries, setSurgeries]     = useState('');
  const [familyHistory, setFamilyHistory] = useState('');
  const [smoking, setSmoking]         = useState<SmokingStatus | ''>('');
  const [alcohol, setAlcohol]         = useState<AlcoholUse | ''>('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (patient.data) {
      setHeightCm(patient.data.height_cm?.toString() ?? '');
      setConditions(patient.data.chronic_conditions ?? []);
      setMedications(patient.data.current_medications ?? []);
      setImmunizations(patient.data.immunizations ?? []);
      setSurgeries(patient.data.past_surgeries ?? '');
      setFamilyHistory(patient.data.family_history ?? '');
      setSmoking(patient.data.smoking_status ?? '');
      setAlcohol(patient.data.alcohol_use ?? '');
    }
  }, [patient.data]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setError(undefined);
    setSuccess(false);
    setSubmitting(true);
    try {
      const hNum = heightCm ? Number(heightCm) : null;
      if (hNum != null && (!Number.isFinite(hNum) || hNum <= 0 || hNum >= 300)) {
        throw new Error('Height should be between 0 and 300 cm.');
      }
      await updatePatientProfile(user.id, {
        height_cm: hNum,
        chronic_conditions: conditions,
        current_medications: medications,
        immunizations,
        past_surgeries: surgeries.trim() || null,
        family_history: familyHistory.trim() || null,
        smoking_status: smoking || null,
        alcohol_use: alcohol || null,
      });
      setSuccess(true);
      setTimeout(() => navigate('/profile'), 800);
    } catch (e: unknown) {
      setError((e as { message?: string })?.message ?? 'Could not save changes.');
    } finally {
      setSubmitting(false);
    }
  };

  if (patient.loading) {
    return (<><Header title="Medical history" showBack /><LoadingSpinner fullScreen /></>);
  }

  return (
    <>
      <Header title="Medical history" showBack />
      <form onSubmit={submit} className="mx-auto max-w-xl px-4 py-4 space-y-4 pb-24" noValidate>
        <Card>
          <div className="text-xs text-ink-muted mb-3">
            This information helps your doctor give you safer, more personal care.
          </div>
          <Input
            label="Height (cm)"
            type="number"
            inputMode="decimal"
            value={heightCm}
            onChange={(e) => setHeightCm(e.target.value)}
            placeholder="e.g. 172"
          />
        </Card>

        <Card>
          <ChipInput
            label="Chronic conditions"
            placeholder="e.g. Hypertension (press Enter)"
            value={conditions}
            onChange={setConditions}
          />
        </Card>

        <Card>
          <ChipInput
            label="Current medications"
            placeholder="e.g. Metformin 500mg (press Enter)"
            value={medications}
            onChange={setMedications}
          />
        </Card>

        <Card>
          <ChipInput
            label="Immunizations"
            placeholder="e.g. Yellow fever 2023 (press Enter)"
            value={immunizations}
            onChange={setImmunizations}
          />
        </Card>

        <Card>
          <label htmlFor="surgeries" className="mb-1.5 block text-sm font-medium text-ink-soft dark:text-slate-300">
            Past surgeries
          </label>
          <textarea
            id="surgeries"
            value={surgeries}
            onChange={(e) => setSurgeries(e.target.value)}
            rows={3}
            placeholder="e.g. Appendectomy — 2018, Johns Hopkins"
            className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
          />
        </Card>

        <Card>
          <label htmlFor="family" className="mb-1.5 block text-sm font-medium text-ink-soft dark:text-slate-300">
            Family history
          </label>
          <textarea
            id="family"
            value={familyHistory}
            onChange={(e) => setFamilyHistory(e.target.value)}
            rows={3}
            placeholder="e.g. Father: hypertension, Mother: diabetes"
            className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
          />
        </Card>

        <Card>
          <div className="mb-2 text-sm font-medium text-ink-soft dark:text-slate-300">Smoking</div>
          <SegmentedPicker
            value={smoking}
            onChange={setSmoking}
            options={SMOKING_OPTIONS}
          />
        </Card>

        <Card>
          <div className="mb-2 text-sm font-medium text-ink-soft dark:text-slate-300">Alcohol use</div>
          <SegmentedPicker
            value={alcohol}
            onChange={setAlcohol}
            options={ALCOHOL_OPTIONS}
          />
        </Card>

        {error && <Alert tone="error">{error}</Alert>}
        {success && <Alert tone="success">Saved.</Alert>}

        <Button type="submit" fullWidth size="lg" loading={submitting}>Save medical history</Button>
      </form>
    </>
  );
}

function ChipInput({
  label, placeholder, value, onChange,
}: {
  label: string;
  placeholder: string;
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const [draft, setDraft] = useState('');
  const commit = () => {
    const t = draft.trim();
    if (!t) return;
    if (value.includes(t)) { setDraft(''); return; }
    onChange([...value, t]);
    setDraft('');
  };
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      commit();
    } else if (e.key === 'Backspace' && !draft && value.length) {
      onChange(value.slice(0, -1));
    }
  };
  const remove = (idx: number) => onChange(value.filter((_, i) => i !== idx));
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-ink-soft dark:text-slate-300">{label}</label>
      <div className="flex flex-wrap gap-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1.5 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20">
        {value.map((chip, i) => (
          <span key={`${chip}-${i}`} className="inline-flex items-center gap-1 rounded-full bg-brand-50 dark:bg-brand-500/15 px-2.5 py-1 text-xs font-semibold text-brand-700 dark:text-brand-300">
            {chip}
            <button type="button" onClick={() => remove(i)} aria-label={`Remove ${chip}`} className="opacity-70 hover:opacity-100">
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKey}
          onBlur={commit}
          placeholder={value.length === 0 ? placeholder : ''}
          className="flex-1 min-w-[8rem] bg-transparent px-1.5 py-1 text-sm outline-none"
        />
      </div>
    </div>
  );
}

function SegmentedPicker<T extends string>({
  value, onChange, options,
}: {
  value: T | '';
  onChange: (v: T | '') => void;
  options: { v: T; label: string }[];
}) {
  return (
    <div className="flex gap-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-1">
      {options.map((o) => (
        <button
          key={o.v}
          type="button"
          onClick={() => onChange(value === o.v ? '' : o.v)}
          aria-pressed={value === o.v}
          className={cn(
            'flex-1 rounded-lg py-2 text-xs font-bold transition',
            value === o.v
              ? 'bg-ink text-white dark:bg-ink-onDark dark:text-ink shadow-sm'
              : 'text-ink-soft dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
