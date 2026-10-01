import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { AvatarUploader } from '@/components/profile/AvatarUploader';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useAuth } from '@/contexts/AuthContext';
import { useAsync } from '@/hooks/useAsync';
import { getMyDoctorProfile, updateMyDoctorProfile } from '@/lib/api/doctors';
import { updateBaseProfile } from '@/lib/api/profile';
import { cn } from '@/lib/cn';
import type { AppointmentMode } from '@/types';

const ALL_MODES: AppointmentMode[] = ['video', 'clinic', 'home'];

export function DoctorEditProfilePage() {
  const { profile, user, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const doctor = useAsync(async () => (user ? getMyDoctorProfile(user.id) : null), [user?.id]);

  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [specialty, setSpecialty] = useState('');
  const [qualifications, setQualifications] = useState('');
  const [bio, setBio] = useState('');
  const [years, setYears] = useState('');
  const [fee, setFee] = useState('');
  const [modes, setModes] = useState<AppointmentMode[]>(['video']);
  const [address, setAddress] = useState('');
  const [languages, setLanguages] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (doctor.data) {
      setSpecialty(doctor.data.specialty ?? '');
      setQualifications(doctor.data.qualifications ?? '');
      setBio(doctor.data.bio ?? '');
      setYears(doctor.data.years_experience != null ? String(doctor.data.years_experience) : '');
      setFee(doctor.data.consultation_fee != null ? String(doctor.data.consultation_fee) : '');
      setModes(doctor.data.modes?.length ? doctor.data.modes : ['video']);
      setAddress(doctor.data.clinic_address ?? '');
      setLanguages(doctor.data.languages?.join(', ') ?? '');
    }
  }, [doctor.data]);

  const toggleMode = (m: AppointmentMode) => {
    setModes((prev) => prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setError(undefined);
    setSuccess(false);
    setSubmitting(true);
    try {
      await Promise.all([
        updateBaseProfile(user.id, {
          full_name: fullName.trim() || null,
          phone: phone.trim() || null,
        }),
        updateMyDoctorProfile(user.id, {
          specialty: specialty.trim() || null,
          qualifications: qualifications.trim() || null,
          bio: bio.trim() || null,
          years_experience: years.trim() ? Number(years) : null,
          consultation_fee: fee.trim() ? Number(fee) : null,
          modes: modes.length ? modes : ['video'],
          clinic_address: address.trim() || null,
          languages: languages.split(',').map((s) => s.trim()).filter(Boolean),
        }),
      ]);
      await refreshProfile();
      setSuccess(true);
      setTimeout(() => navigate('/profile'), 800);
    } catch (e: unknown) {
      setError((e as { message?: string })?.message ?? 'Could not save.');
    } finally {
      setSubmitting(false);
    }
  };

  if (doctor.loading) return (<><Header title="Edit profile" showBack /><LoadingSpinner fullScreen /></>);

  return (
    <>
      <Header title="Edit profile" showBack />
      <form onSubmit={submit} className="mx-auto max-w-3xl px-4 py-4 space-y-4" noValidate>
        <Card padding="lg">
          {user && (
            <AvatarUploader
              userId={user.id}
              name={fullName || profile?.full_name}
              currentUrl={profile?.avatar_url ?? null}
              onChange={() => { refreshProfile(); }}
            />
          )}
        </Card>

        {error && <Alert tone="error">{error}</Alert>}
        {success && <Alert tone="success">Profile saved.</Alert>}

        <Input label="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Dr. Jane Doe" />
        <Input label="Phone"     type="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 555 123 4567" />
        <Input label="Specialty" value={specialty} onChange={(e) => setSpecialty(e.target.value)} placeholder="e.g. Cardiology" />
        <Input label="Qualifications" value={qualifications} onChange={(e) => setQualifications(e.target.value)} placeholder="e.g. MBBS, MD" />

        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink-soft dark:text-slate-300">Bio</label>
          <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={4}
            placeholder="Tell patients about your experience and approach."
            className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input label="Years of experience" type="number" min={0} max={80} value={years} onChange={(e) => setYears(e.target.value)} />
          <Input label="Consultation fee (GH₵)" type="number" step="0.01" min={0} value={fee} onChange={(e) => setFee(e.target.value)} />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink-soft dark:text-slate-300">Consultation modes</label>
          <div className="flex gap-2">
            {ALL_MODES.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => toggleMode(m)}
                aria-pressed={modes.includes(m)}
                className={cn(
                  'rounded-full border px-3 py-1.5 text-xs font-semibold capitalize transition',
                  modes.includes(m)
                    ? 'bg-brand-500 border-brand-500 text-white'
                    : 'border-slate-300 dark:border-slate-700 text-ink-soft dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800',
                )}
              >{m}</button>
            ))}
          </div>
          <p className="mt-1 text-xs text-ink-muted">At least one mode is required.</p>
        </div>

        <Input label="Clinic address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Only shown for clinic mode" />
        <Input label="Languages" value={languages} onChange={(e) => setLanguages(e.target.value)} placeholder="Comma-separated · e.g. English, Spanish" />

        <Button type="submit" fullWidth size="lg" loading={submitting}>Save changes</Button>
      </form>
    </>
  );
}
