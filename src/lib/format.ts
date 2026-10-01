/**
 * Small formatting helpers used across the app. Keep them plain functions —
 * no i18n library yet.
 */

/**
 * Format a monetary amount. Currency defaults to Ghana Cedis (GHS) since
 * Doctor Cares operates in Ghana. Uses en-GH locale so the symbol renders
 * as "GH₵" (or "₵" depending on the browser's ICU version).
 */
export const fmtMoney = (
  amount: number | null | undefined,
  currency = 'GHS',
  locale: string | undefined = 'en-GH',
) => {
  if (amount == null) return '—';
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount);
  } catch {
    return `₵${amount.toFixed(2)}`;
  }
};

export const fmtDate = (iso: string, opts: Intl.DateTimeFormatOptions = { weekday: 'short', month: 'short', day: 'numeric' }) =>
  new Date(iso).toLocaleDateString(undefined, opts);

export const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

export const fmtDateTime = (iso: string) =>
  `${fmtDate(iso)} · ${fmtTime(iso)}`;

/** "in 2h", "3 days ago" — coarse relative time. */
export const fmtRelative = (iso: string) => {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diff = Math.round((then - now) / 60_000); // minutes
  const abs = Math.abs(diff);
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
  if (abs < 60)      return rtf.format(diff, 'minute');
  if (abs < 60 * 24) return rtf.format(Math.round(diff / 60), 'hour');
  return rtf.format(Math.round(diff / (60 * 24)), 'day');
};

export const initialsOf = (name?: string | null) => {
  if (!name) return '·';
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('') || '·';
};

/**
 * Greeting key for the local hour — resolved via i18n at the call site.
 * Returns one of 'morning' | 'afternoon' | 'evening' so callers can do
 * `t('greeting.' + greetingKeyFor())`.
 */
export const greetingKeyFor = (hour = new Date().getHours()) => {
  if (hour < 12) return 'morning' as const;
  if (hour < 18) return 'afternoon' as const;
  return 'evening' as const;
};

/** Back-compat helper for callers that still want a hardcoded English string. */
export const greetingFor = (hour = new Date().getHours()) => {
  const k = greetingKeyFor(hour);
  return k === 'morning' ? 'Good morning' : k === 'afternoon' ? 'Good afternoon' : 'Good evening';
};
