import { Link } from 'react-router-dom';
import { Star, Video, MapPin, ChevronRight } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { cn } from '@/lib/cn';
import { fmtMoney } from '@/lib/format';
import type { DoctorListItem } from '@/lib/api/doctors';

interface Props {
  doctor: DoctorListItem;
  /** compact = smaller card for dashboard lists */
  variant?: 'default' | 'compact';
  className?: string;
}

export function DoctorCard({ doctor, variant = 'default', className }: Props) {
  const p = doctor.profile;
  const hasVideo = doctor.modes?.includes('video');
  const hasClinic = doctor.modes?.includes('clinic');

  return (
    <Link
      to={`/doctors/${doctor.id}`}
      className={cn(
        'flex items-center gap-3 rounded-2xl border border-slate-200/70 dark:border-slate-800',
        'bg-white dark:bg-slate-900 shadow-card transition hover:shadow-pop active:scale-[0.995]',
        variant === 'compact' ? 'p-3' : 'p-4',
        className,
      )}
    >
      <Avatar name={p?.full_name} src={p?.avatar_url ?? undefined} size={variant === 'compact' ? 'md' : 'lg'} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-ink dark:text-ink-onDark">
          {p?.full_name ?? 'Doctor'}
        </div>
        <div className="mt-0.5 truncate text-xs text-ink-muted">
          {doctor.specialty ?? 'General practitioner'}
          {doctor.years_experience ? ` · ${doctor.years_experience} yr${doctor.years_experience > 1 ? 's' : ''}` : ''}
        </div>
        {variant === 'default' && (
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {doctor.rating != null && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
                <Star className="h-3 w-3 fill-current" aria-hidden />
                {doctor.rating.toFixed(1)}
                {doctor.rating_count > 0 && <span className="font-normal opacity-70">({doctor.rating_count})</span>}
              </span>
            )}
            {doctor.consultation_fee != null && (
              <span className="inline-flex items-center rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-semibold text-brand-700 dark:bg-brand-500/15 dark:text-brand-200">
                {fmtMoney(doctor.consultation_fee)}
              </span>
            )}
            {hasVideo && (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-ink-soft dark:bg-slate-800 dark:text-slate-300">
                <Video className="h-3 w-3" aria-hidden /> Video
              </span>
            )}
            {hasClinic && (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-ink-soft dark:bg-slate-800 dark:text-slate-300">
                <MapPin className="h-3 w-3" aria-hidden /> Clinic
              </span>
            )}
          </div>
        )}
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-ink-muted" aria-hidden />
    </Link>
  );
}
