/**
 * Password validation & strength scoring — pure, no dependencies.
 */

export interface PasswordRule {
  key: string;
  label: string;
  passes: (pw: string) => boolean;
}

export const PASSWORD_RULES: PasswordRule[] = [
  { key: 'len',   label: 'At least 8 characters',        passes: (p) => p.length >= 8 },
  { key: 'upper', label: 'One uppercase letter (A–Z)',   passes: (p) => /[A-Z]/.test(p) },
  { key: 'lower', label: 'One lowercase letter (a–z)',   passes: (p) => /[a-z]/.test(p) },
  { key: 'num',   label: 'One number (0–9)',             passes: (p) => /\d/.test(p) },
  { key: 'sym',   label: 'One symbol (! ? @ # …)',       passes: (p) => /[^A-Za-z0-9]/.test(p) },
];

export const isPasswordValid = (pw: string): boolean =>
  PASSWORD_RULES.every((r) => r.passes(pw));

export const passwordScore = (pw: string): number =>
  PASSWORD_RULES.reduce((n, r) => n + (r.passes(pw) ? 1 : 0), 0);

export interface StrengthMeta {
  score: number;              // 0..5
  label: 'Empty' | 'Weak' | 'Okay' | 'Good' | 'Strong';
  color: string;              // Tailwind class fragment for the bar
  textColor: string;
}

export const strengthMeta = (pw: string): StrengthMeta => {
  if (pw.length === 0) return { score: 0, label: 'Empty', color: 'bg-slate-200 dark:bg-slate-700', textColor: 'text-ink-muted' };
  const s = passwordScore(pw);
  if (s <= 2) return { score: s, label: 'Weak',   color: 'bg-danger',                 textColor: 'text-danger' };
  if (s === 3) return { score: s, label: 'Okay',  color: 'bg-warning',                textColor: 'text-warning' };
  if (s === 4) return { score: s, label: 'Good',  color: 'bg-accent-500',             textColor: 'text-accent-600 dark:text-accent-500' };
  return          { score: s, label: 'Strong', color: 'bg-success',                textColor: 'text-success' };
};
