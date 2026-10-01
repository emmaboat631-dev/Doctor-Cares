import { useEffect, type MouseEvent } from 'react';
import { Link } from 'react-router-dom';
import { Ambulance, Phone, Shield, Siren, X, Flame, UserRound } from 'lucide-react';
import { bump } from '@/lib/native/haptics';

/**
 * Ghana emergency numbers (as of 2026). The unified 112 is routed to the
 * national emergency centre; the service-specific lines reach each agency
 * directly, which is often faster in Accra and Kumasi.
 */
const EMERGENCY_SERVICES = [
  { label: 'Ambulance (NAS)', number: '193', icon: Ambulance, tone: 'bg-rose-500' },
  { label: 'Police',          number: '191', icon: Shield,    tone: 'bg-blue-600' },
  { label: 'Fire Service',    number: '192', icon: Flame,     tone: 'bg-orange-500' },
  { label: 'All emergencies', number: '112', icon: Siren,     tone: 'bg-red-600' },
];

interface Props {
  open: boolean;
  onClose: () => void;
  contactName?: string | null;
  contactPhone?: string | null;
  contactRelation?: string | null;
}

export function SosSheet({ open, onClose, contactName, contactPhone, contactRelation }: Props) {
  useEffect(() => {
    if (!open) return;
    // Haptic bump on open — the user feels the sheet appear so they know
    // the SOS was actually invoked (helpful under panic).
    bump();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  // Confirm before dialing a government emergency line — too easy to
  // trigger a false ambulance call otherwise. Personal contact is NOT
  // confirmed; the user picked that person themselves.
  const confirmEmergencyCall = (number: string, label: string) =>
    (e: MouseEvent<HTMLAnchorElement>) => {
      if (!confirm(`Call ${label} (${number}) now?`)) e.preventDefault();
    };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label="Emergency SOS"
    >
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />

      <div className="relative w-full max-w-md rounded-t-3xl sm:rounded-3xl bg-white dark:bg-slate-900 shadow-2xl safe-bottom overflow-hidden animate-[slide-up_240ms_cubic-bezier(0.32,0.72,0,1)]">
        {/* Red header */}
        <div className="bg-gradient-to-br from-rose-600 to-red-700 px-5 pt-5 pb-4 text-white">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-white/15 ring-1 ring-white/25">
                <Siren className="h-5 w-5" />
              </div>
              <div>
                <div className="text-lg font-bold">Emergency SOS</div>
                <div className="text-xs opacity-90">Tap a line to call immediately.</div>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="grid h-9 w-9 place-items-center rounded-full bg-white/15 hover:bg-white/25"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {/* Personal next-of-kin */}
          {contactPhone ? (
            <a
              href={`tel:${contactPhone.replace(/\s+/g, '')}`}
              className="flex items-center gap-3 rounded-2xl bg-brand-50 dark:bg-brand-500/15 border border-brand-200/70 dark:border-brand-500/30 p-3 active:scale-[0.98] transition"
            >
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-brand-500 text-white">
                <UserRound className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-bold uppercase tracking-wider text-brand-700 dark:text-brand-300">Your emergency contact</div>
                <div className="truncate text-sm font-bold">{contactName ?? 'Contact'}{contactRelation ? ` · ${contactRelation}` : ''}</div>
                <div className="truncate text-xs text-ink-muted">{contactPhone}</div>
              </div>
              <Phone className="h-5 w-5 text-brand-600 dark:text-brand-300" />
            </a>
          ) : (
            <Link
              to="/profile/edit"
              onClick={onClose}
              className="block rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-3 text-center hover:bg-slate-50 dark:hover:bg-slate-800 transition"
            >
              <div className="text-sm font-bold">Add an emergency contact</div>
              <div className="mt-0.5 text-xs text-ink-muted">So we can reach your next-of-kin fast.</div>
            </Link>
          )}

          {/* Service lines */}
          <div className="space-y-2">
            <div className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">Ghana emergency services</div>
            {EMERGENCY_SERVICES.map((s) => (
              <a
                key={s.number}
                href={`tel:${s.number}`}
                onClick={confirmEmergencyCall(s.number, s.label)}
                className="flex items-center gap-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 active:scale-[0.98] transition"
              >
                <div className={`grid h-11 w-11 place-items-center rounded-xl text-white ${s.tone}`}>
                  <s.icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold">{s.label}</div>
                  <div className="text-xs text-ink-muted">{s.number}</div>
                </div>
                <Phone className="h-5 w-5 text-ink-muted" />
              </a>
            ))}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-full h-11 rounded-full border border-slate-300 dark:border-slate-700 text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            Cancel
          </button>
        </div>
      </div>

      <style>{`
        @keyframes slide-up { from { transform: translateY(20%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      `}</style>
    </div>
  );
}
