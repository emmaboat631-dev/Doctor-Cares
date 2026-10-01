import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Doctor Cares — Capacitor config.
 *
 * We ship the built web assets bundled inside the APK so the app works
 * fully offline (Supabase calls still need network, but the shell loads
 * without one). `androidScheme: 'https'` is required for Supabase auth +
 * `secure` cookies to work under Capacitor's `capacitor://` origin.
 *
 * Splash screen shows the brand illustration for 1.5s, then the SplashScreen
 * plugin's hide() is called from src/main.tsx so the transition to the app
 * feels instant.
 */
const config: CapacitorConfig = {
  appId: 'app.doctorcares.mobile',
  appName: 'Doctor Cares',
  webDir: 'dist',
  bundledWebRuntime: false,

  server: {
    androidScheme: 'https',
    // If you want the Android app to load live from Vercel instead of the
    // bundled assets (auto-updates without app-store release), uncomment:
    // url: 'https://doctor-cares-ten.vercel.app',
    // cleartext: false,
  },

  android: {
    // Allow http *only in debug* — production still forces HTTPS via the
    // Network Security Config in AndroidManifest edits.
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: true,
  },

  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: false, // we hide manually in main.tsx when React is ready
      launchFadeOutDuration: 300,
      backgroundColor: '#F5F7FB',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      // Style applied at boot; runtime overrides live in src/lib/native/statusBar.ts
      style: 'DEFAULT',
      backgroundColor: '#F5F7FB',
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true,
    },
    Camera: {
      // Prompt localization defaults are fine — plugin uses OS-level UI.
    },
  },
};

export default config;
