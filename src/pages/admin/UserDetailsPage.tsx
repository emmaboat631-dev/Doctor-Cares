import { useParams } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { useAsync } from '@/hooks/useAsync';
import { getAdminUserDetail } from '@/lib/api/admin';
import { fmtDate } from '@/lib/format';

export function AdminUserDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const detail = useAsync(() => (id ? getAdminUserDetail(id) : Promise.resolve(null)), [id]);

  if (detail.loading) return (<><Header title="User" showBack /><LoadingSpinner fullScreen /></>);
  if (!detail.data)   return (<><Header title="User" showBack /><EmptyState title="User not found" /></>);

  const { profile, doctor, patient, appointment_count, reports_filed } = detail.data;

  return (
    <>
      <Header title="User details" showBack />
      <div className="mx-auto max-w-3xl px-4 py-4 space-y-4">
        <Card padding="lg" className="text-center">
          <Avatar name={profile.full_name} src={profile.avatar_url ?? undefined} size="xl" className="mx-auto" />
          <div className="mt-3 text-lg font-bold">{profile.full_name ?? 'User'}</div>
          <div className="mt-1 flex justify-center gap-1.5 flex-wrap">
            <Badge tone="brand" className="capitalize">{profile.role}</Badge>
            <Badge tone={profile.status === 'active' ? 'success' : profile.status === 'suspended' ? 'danger' : 'warning'} className="capitalize">{profile.status}</Badge>
            {doctor?.is_verified && <Badge tone="success">Verified</Badge>}
          </div>
        </Card>

        <Card>
          <div className="text-sm font-semibold mb-2">Account</div>
          <div className="grid gap-1.5 text-sm">
            <Row label="Joined" value={fmtDate(profile.created_at, { month: 'long', day: 'numeric', year: 'numeric' })} />
            <Row label="Appointments" value={appointment_count} />
            <Row label="Reports filed" value={reports_filed} />
            {profile.phone && <Row label="Phone" value={profile.phone} />}
          </div>
        </Card>

        {doctor && (
          <Card>
            <div className="text-sm font-semibold mb-2">Doctor profile</div>
            <div className="grid gap-1.5 text-sm">
              {doctor.specialty && <Row label="Specialty" value={doctor.specialty} />}
              {doctor.qualifications && <Row label="Qualifications" value={doctor.qualifications} />}
              {doctor.years_experience != null && <Row label="Experience" value={`${doctor.years_experience} yrs`} />}
              {doctor.rating != null && <Row label="Rating" value={`${doctor.rating.toFixed(1)} (${doctor.rating_count})`} />}
              <Row label="Verified" value={doctor.is_verified ? 'Yes' : 'No'} />
            </div>
          </Card>
        )}

        {patient && (patient.date_of_birth || patient.blood_group || patient.allergies) && (
          <Card>
            <div className="text-sm font-semibold mb-2">Medical profile</div>
            <div className="grid gap-1.5 text-sm">
              {patient.date_of_birth && <Row label="DOB" value={patient.date_of_birth} />}
              {patient.gender && <Row label="Gender" value={patient.gender} />}
              {patient.blood_group && <Row label="Blood group" value={patient.blood_group} />}
              {patient.allergies && <Row label="Allergies" value={patient.allergies} />}
            </div>
          </Card>
        )}
      </div>
    </>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <span className="text-ink-muted">{label}</span>
      <span className="font-semibold text-right">{value}</span>
    </div>
  );
}
