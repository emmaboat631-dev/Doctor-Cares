import { Capacitor } from '@capacitor/core';

/**
 * True when running inside a Capacitor native shell (Android / iOS).
 * Everywhere we branch native vs web behavior — camera, haptics, deep links —
 * routes through this so the same components work in both environments.
 */
export const isNative = (): boolean => Capacitor.isNativePlatform();

/** 'android' | 'ios' | 'web' */
export const nativePlatform = (): 'android' | 'ios' | 'web' =>
  Capacitor.getPlatform() as 'android' | 'ios' | 'web';
