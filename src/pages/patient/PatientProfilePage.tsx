import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, ChevronRight, ClipboardList, Download, LogOut, Pill, Settings, Share2, Shield, User } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
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
      <Header title="Profile" right={<Link to="/settings" aria-label="Settings" className="grid h-10 w-10 place-items-center rounded-full text-ink-muted hover:bg-slate-100 dark:hover:bg-slate-800"><Settings className="h-4 w-4" /></Link>} />
      <div className="mx-auto max-w-3xl px-4 py-4 space-y-4">
        <Card padding="lg" className="text-center">
          <Avatar name={profile?.full_name} src={profile?.avatar_url ?? undefined} size="xl" className="mx-auto" />
          <h1 className="mt-3 text-lg font-bold">{profile?.full_name ?? 'You'}</h1>
          <div className="mt-1 text-xs text-ink-muted">{user?.email}</div>
          <Badge tone="brand" className="mt-2">Patient</Badge>
        </Card>

        <div className="grid grid-cols-2 gap-2">
          <StatTile num={stats.data?.appointments ?? 0} label="Appointments" />
          <StatTile num={stats.data?.doctors ?? 0} label="Doctors" />
        </div>

        <div className="rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
          <MenuRow href="/profile/edit" icon={<User className="h-4 w-4" />} label="Edit profile" />
          <MenuRow href="/profile/medical-history" icon={<ClipboardList className="h-4 w-4" />} label="Medical history" />
          <MenuRow href="/prescriptions" icon={<Pill className="h-4 w-4" />} label="Prescriptions" />
          <MenuRow href="/referrals" icon={<Share2 className="h-4 w-4" />} label="Referrals" />
          <button type="button" onClick={exportRecord} disabled={exporting}
            className="flex items-center gap-3 w-full border-b border-slate-200/70 dark:border-slate-800 px-4 py-3 last:border-none hover:bg-slate-50 dark:hover:bg-slate-800/60 text-left disabled:opacity-60">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-surface-soft dark:bg-slate-800 text-ink-soft dark:text-slate-300">
              <Download className="h-4 w-4" />
            </span>
            <span className="flex-1 text-sm font-medium">{exporting ? 'Preparing…' : 'Export medical record (PDF)'}</span>
            <ChevronRight className="h-4 w-4 text-ink-muted" />
          </button>
          <MenuRow href="/settings"     icon={<Shield className="h-4 w-4" />} label="Privacy & security" />
          <MenuRow href="/notifications" icon={<Bell className="h-4 w-4" />} label="Notifications" />
        </div>

        <button
          type="button"
          onClick={signOut}
          className="w-full flex items-center justify-center gap-2 rounded-2xl border border-danger/30 bg-white dark:bg-slate-900 px-4 py-3 text-sm font-semibold text-danger hover:bg-danger-soft"
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
      <div className="text-xl font-bold">{num}</div>
      <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink-muted">{label}</div>
    </Card>
  );
}

function MenuRow({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      to={href}
      className="flex items-center gap-3 border-b border-slate-200/70 dark:border-slate-800 px-4 py-3 last:border-none hover:bg-slate-50 dark:hover:bg-slate-800/60"
    >
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-surface-soft dark:bg-slate-800 text-ink-soft dark:text-slate-300">
        {icon}
      </span>
      <span className="flex-1 text-sm font-medium">{label}</span>
      <ChevronRight className="h-4 w-4 text-ink-muted" />
    </Link>
  );
}
