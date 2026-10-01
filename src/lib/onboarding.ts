/**
 * Small persistent flag: has this device seen the onboarding carousel yet?
 * We check this at boot to decide whether to route a signed-out visitor to
 *   /welcome  (first time — full splash → onboarding → login flow)
 * or
 *   /login    (returning user — straight to sign-in)
 */

const KEY = 'dc:onboarded';

export const hasSeenOnboarding = (): boolean => {
  try { return !!localStorage.getItem(KEY); } catch { return false; }
};

export const markOnboardingSeen = (): void => {
  try { localStorage.setItem(KEY, String(Date.now())); } catch { /* ignore */ }
};

export const clearOnboardingSeen = (): void => {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
};
