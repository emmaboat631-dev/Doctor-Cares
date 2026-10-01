import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';
import { App } from '@capacitor/app';
import { Keyboard } from '@capacitor/keyboard';
import { isNative, nativePlatform } from './platform';

/**
 * One-shot native bootstrap. Called once from main.tsx before React mounts.
 * Handles the splash screen fade, initial status-bar style, keyboard behavior,
 * and Android hardware back button.
 *
 * All calls are guarded by isNative() so this is a no-op in the browser.
 */
export async function bootstrapNative(): Promise<void> {
  if (!isNative()) return;

  // Match the app's light-mode background so the status bar area is seamless.
  // On Android we also DISABLE the default "overlays WebView" behavior so the
  // status bar gets its own reserved strip and page content starts BELOW it.
  // Without this the greeting/header on the patient home sits *under* the
  // status bar and looks overlapped.
  try {
    await StatusBar.setStyle({ style: Style.Light });
    if (nativePlatform() === 'android') {
      await StatusBar.setBackgroundColor({ color: '#F5F7FB' });
      await StatusBar.setOverlaysWebView({ overlay: false });
    }
  } catch { /* status bar may be unavailable on some Android skins */ }

  try {
    await Keyboard.setAccessoryBarVisible({ isVisible: false });
  } catch { /* iOS-only, safe to ignore */ }

  // Toggle a body class while the on-screen keyboard is up so the floating
  // bottom nav can hide itself (see BottomNavigation.tsx). iOS fires the
  // "will*" events; Android only fires "did*", so subscribe to both.
  const open = () => document.body.classList.add('kb-open');
  const close = () => document.body.classList.remove('kb-open');
  Keyboard.addListener('keyboardWillShow', open);
  Keyboard.addListener('keyboardDidShow',  open);
  Keyboard.addListener('keyboardWillHide', close);
  Keyboard.addListener('keyboardDidHide',  close);

  // Android hardware back button — let the browser history handle it if we
  // can go back, otherwise exit the app.
  App.addListener('backButton', ({ canGoBack }) => {
    if (canGoBack) window.history.back();
    else App.exitApp();
  });

  // Fade the native splash once React committed its first paint.
  requestAnimationFrame(async () => {
    try { await SplashScreen.hide({ fadeOutDuration: 300 }); } catch { /* fine */ }
  });
}
