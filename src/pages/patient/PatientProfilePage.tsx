import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, ClipboardList, Download, LogOut, Pill, Settings, Share2, Shield, User } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { MenuRow } from '@/components/ui/MenuRow';
import { SectionGroup } from '@/components/ui/SectionGroup';
import { useAuth } from '@/contexts/AuthContext';
import { useAsync } from '@/hooks/useAsync';
import { countPatientStats, getPatientProfile } from '@/lib/api/profile';
import { listPatientPrescriptions } from '@/lib/api/prescriptions';
import { listPatientAppointments } from '@/lib/api/appointments';
import { latestMetricsByType } from '@/lib/api/healthMetrics';
import { downloadMedicalRecordPdf } from '@/lib/pdf';

export function PatientProfilePage() {
  const { profile, user, signOut } = useAuth();
  const stats = useAsync(async () => (user ? countPatientStats(user.id) : { appointments: 0, doctors: 0 }), [user?.id]);
  const [exporting, setExporting] = useState(false);

  const exportRecord = async () => {
    if (!user) return;
    setExporting(true);
    try {
      const [patient, prescriptions, appointments, metrics] = await Promise.all([
        getPatientProfile(user.id),
        listPatientPrescriptions(user.id),
        listPatientAppointments(user.id),
        latestMetricsByType(user.id),
      ]);
      downloadMedicalRecordPdf({ profile: profile ?? null, patient, prescriptions, appointments, metrics });
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      <Header
        title="Profile"
        right={
          <Link
            to="/settings"
            aria-label="Settings"
            className="grid h-10 w-10 place-items-center rounded-full text-ink-muted touch-manipulation transition-colors duration-150 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <Settings className="h-4 w-4" />
          </Link>
        }
      />
      <div className="mx-auto max-w-3xl px-4 py-4 space-y-4">
        <Card padding="lg" className="text-center">
          <Avatar name={profile?.full_name} src={profile?.avatar_url ?? undefined} size="xl" className="mx-auto" />
          <h1 className="mt-3 text-lg font-semibold">{profile?.full_name ?? 'You'}</h1>
          <div className="mt-1 text-xs text-ink-muted break-all">{user?.email}</div>
          <Badge tone="brand" className="mt-2">Patient</Badge>
        </Card>

        <div className="grid grid-cols-2 gap-2">
          <StatTile num={stats.data?.appointments ?? 0} label="Appointments" />
          <StatTile num={stats.data?.doctors ?? 0} label="Doctors" />
        </div>

        <SectionGroup>
          <MenuRow href="/profile/edit" icon={<User className="h-4 w-4" />} label="Edit profile" />
          <MenuRow href="/profile/medical-history" icon={<ClipboardList className="h-4 w-4" />} label="Medical history" />
          <MenuRow href="/prescriptions" icon={<Pill className="h-4 w-4" />} label="Prescriptions" />
          <MenuRow href="/referrals" icon={<Share2 className="h-4 w-4" />} label="Referrals" />
          <MenuRow
            onClick={exportRecord}
            disabled={exporting}
            icon={<Download className="h-4 w-4" />}
            label={exporting ? 'Preparing…' : 'Export medical record (PDF)'}
          />
          <MenuRow href="/settings"     icon={<Shield className="h-4 w-4" />} label="Privacy & security" />
          <MenuRow href="/notifications" icon={<Bell className="h-4 w-4" />} label="Notifications" />
        </SectionGroup>

        <button
          type="button"
          onClick={signOut}
          className="w-full flex items-center justify-center gap-2 rounded-2xl border border-danger/30 bg-white dark:bg-slate-900 px-4 py-3 text-sm font-semibold text-danger touch-manipulation transition-colors duration-150 hover:bg-danger-soft"
        >
          <LogOut className="h-4 w-4" /> Log out
        </button>
      </div>
    </>
  );
}

function StatTile({ num, label }: { num: number; label: string }) {
  return (
    <Card padding="sm" className="text-center">
      <div className="text-xl font-semibold">{num}</div>
      <div className="mt-0.5 text-label font-semibold uppercase text-ink-muted">{label}</div>
    </Card>
  );
}

