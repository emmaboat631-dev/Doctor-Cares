import { forwardRef, useImperativeHandle, useRef } from 'react';
import HCaptcha from '@hcaptcha/react-hcaptcha';

/**
 * Invisible hCaptcha widget. The parent calls .execute() from its submit
 * handler, awaits the returned token, then passes it to Supabase. hCaptcha
 * only shows a visible challenge for high-risk requests (99.9% passive).
 *
 * The site key comes from VITE_HCAPTCHA_SITE_KEY. If it isn't set, the
 * component renders nothing and execute() resolves to undefined — Supabase
 * then rejects the request if captcha is enforced, surfacing a clear error.
 */
export interface CaptchaHandle {
  /** Trigger a challenge and return the token (or undefined if no site key). */
  execute: () => Promise<string | undefined>;
  reset: () => void;
}

export const Captcha = forwardRef<CaptchaHandle>((_props, ref) => {
  const siteKey = import.meta.env.VITE_HCAPTCHA_SITE_KEY as string | undefined;
  const hcapRef = useRef<HCaptcha>(null);

  useImperativeHandle(ref, () => ({
    execute: async () => {
      if (!siteKey || !hcapRef.current) return undefined;
      try {
        const res = await hcapRef.current.execute({ async: true });
        return res?.response;
      } catch {
        return undefined;
      }
    },
    reset: () => { hcapRef.current?.resetCaptcha(); },
  }), [siteKey]);

  if (!siteKey) return null;
  return (
    <HCaptcha
      ref={hcapRef}
      sitekey={siteKey}
      size="invisible"
      // Theme follows the dark class on <html> — no explicit prop so hCaptcha
      // auto-detects. On the visible challenge, it reads the system preference.
    />
  );
});
Captcha.displayName = 'Captcha';
