import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { isNative } from './platform';

/**
 * Fire a light haptic tap. No-op on the web. Wraps native errors so callers
 * never have to try/catch — a missing haptics engine (emulator, some devices)
 * should never break a UI interaction.
 */
export async function tap(): Promise<void> {
  if (!isNative()) return;
  try {
    await Haptics.impact({ style: ImpactStyle.Light });
  } catch { /* fine — device without haptics */ }
}

/** Medium bump — use for confirming a destructive action or success toast. */
export async function bump(): Promise<void> {
  if (!isNative()) return;
  try {
    await Haptics.impact({ style: ImpactStyle.Medium });
  } catch { /* ignore */ }
}
