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
import { getPatientProfile, updateBaseProfile, updatePatientProfile } from '@/lib/api/profile';

export function EditProfilePage() {
  const { profile, user, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const patient = useAsync(() => (user ? getPatientProfile(user.id) : Promise.resolve(null)), [user?.id]);

  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('');
  const [bloodGroup, setBloodGroup] = useState('');
  const [allergies, setAllergies] = useState('');
  const [emName, setEmName] = useState('');
  const [emPhone, setEmPhone] = useState('');
  const [emRelation, setEmRelation] = useState('');
  const [nhisNumber, setNhisNumber] = useState('');
  const [nhisExpires, setNhisExpires] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (patient.data) {
      setDob(patient.data.date_of_birth ?? '');
      setGender(patient.data.gender ?? '');
      setBloodGroup(patient.data.blood_group ?? '');
      setAllergies(patient.data.allergies ?? '');
      setEmName(patient.data.emergency_contact_name ?? '');
      setEmPhone(patient.data.emergency_contact_phone ?? '');
      setEmRelation(patient.data.emergency_contact_relation ?? '');
      setNhisNumber(patient.data.nhis_number ?? '');
      setNhisExpires(patient.data.nhis_expires ?? '');
    }
  }, [patient.data]);

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
        updatePatientProfile(user.id, {
          date_of_birth: dob || null,
          gender: gender.trim() || null,
          blood_group: bloodGroup.trim() || null,
          allergies: allergies.trim() || null,
          emergency_contact_name: emName.trim() || null,
          emergency_contact_phone: emPhone.trim() || null,
          emergency_contact_relation: emRelation.trim() || null,
          nhis_number: nhisNumber.trim() || null,
          nhis_expires: nhisExpires || null,
        }),
      ]);
      await refreshProfile();
      setSuccess(true);
      setTimeout(() => navigate('/profile'), 800);
    } catch (e: unknown) {
      setError((e as { message?: string })?.message ?? 'Could not save changes.');
    } finally {
      setSubmitting(false);
    }
  };

  if (patient.loading) return (<><Header title="Edit profile" showBack /><LoadingSpinner fullScreen /></>);

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

        <Input label="Full name"
          value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your full name" />
        <Input label="Phone" type="tel" autoComplete="tel"
          value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 555 123 4567" />
        <Input label="Date of birth" type="date"
          value={dob} onChange={(e) => setDob(e.target.value)} />
        <Input label="Gender"
          value={gender} onChange={(e) => setGender(e.target.value)} placeholder="e.g. Female, Male, Non-binary" />
        <Input label="Blood group"
          value={bloodGroup} onChange={(e) => setBloodGroup(e.target.value)} placeholder="e.g. O+" />
        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink-soft dark:text-slate-300">Known allergies</label>
          <textarea
            value={allergies} onChange={(e) => setAllergies(e.target.value)} rows={3}
            placeholder="e.g. Penicillin, peanuts"
            className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
          />
        </div>

        <Card padding="lg">
          <div className="mb-3">
            <div className="text-sm font-bold">NHIS insurance</div>
            <div className="mt-0.5 text-xs text-ink-muted">
              Your National Health Insurance Scheme (Ghana) membership. Doctors file claims against this.
            </div>
          </div>
          <div className="space-y-3">
            <Input label="NHIS number" value={nhisNumber}
              onChange={(e) => setNhisNumber(e.target.value)}
              placeholder="e.g. 123456789012" />
            <Input label="Expires" type="date" value={nhisExpires}
              onChange={(e) => setNhisExpires(e.target.value)} />
          </div>
        </Card>

        <Card padding="lg">
          <div className="mb-3">
            <div className="text-sm font-bold">Emergency contact</div>
            <div className="mt-0.5 text-xs text-ink-muted">
              Who should we call in an emergency? This person's number appears in your SOS sheet.
            </div>
          </div>
          <div className="space-y-3">
            <Input label="Contact name"
              value={emName} onChange={(e) => setEmName(e.target.value)} placeholder="e.g. Ama Mensah" />
            <Input label="Contact phone" type="tel" autoComplete="tel"
              value={emPhone} onChange={(e) => setEmPhone(e.target.value)} placeholder="+233 24 123 4567" />
            <Input label="Relation"
              value={emRelation} onChange={(e) => setEmRelation(e.target.value)} placeholder="e.g. Sister, Spouse, Parent" />
          </div>
        </Card>

        <Button type="submit" fullWidth size="lg" loading={submitting}>Save changes</Button>
      </form>
    </>
  );
}
