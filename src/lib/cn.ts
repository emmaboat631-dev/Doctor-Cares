import clsx, { type ClassValue } from 'clsx';

/** Convenience wrapper — kept small so we can swap for tailwind-merge later if needed. */
export const cn = (...inputs: ClassValue[]) => clsx(inputs);
