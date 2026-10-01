import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'node:path';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // 'prompt' so we can surface a nice "New version — Reload" toast in-app
      // instead of the SW updating silently under the user's feet mid-flow.
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['brand-illustration.png', 'offline.html'],
      manifest: {
        name: 'Doctor Cares',
        short_name: 'DoctorCares',
        description: 'Healthcare. Anytime. Anywhere.',
        theme_color: '#1E5EFF',
        background_color: '#FFFFFF',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        lang: 'en',
        categories: ['medical', 'health', 'lifestyle'],
        icons: [
          { src: '/brand-illustration.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/brand-illustration.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/brand-illustration.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        // Don't auto-activate — we prompt the user via UpdatePrompt.tsx.
        skipWaiting: false,
        navigateFallback: '/offline.html',
        navigateFallbackDenylist: [/^\/api\//],
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        // Append our web-push handler (push + notificationclick listeners)
        // to the generated SW so iOS PWA and desktop browser pushes work.
        importScripts: ['/push-sw.js'],
        runtimeCaching: [
          // OpenFDA drug labels — long-lived reference data, safe to cache.
          {
            urlPattern: ({ url }) => url.origin === 'https://api.fda.gov',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'openfda-api',
              expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 },
              networkTimeoutSeconds: 5,
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // Google Fonts CSS + font files.
          {
            urlPattern: ({ url }) => url.origin === 'https://fonts.googleapis.com',
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'google-fonts-css' },
          },
          {
            urlPattern: ({ url }) => url.origin === 'https://fonts.gstatic.com',
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // All images (Supabase Storage, brand-illustration, etc.).
          {
            urlPattern: ({ request }) => request.destination === 'image',
            handler: 'CacheFirst',
            options: {
              cacheName: 'images',
              expiration: { maxEntries: 80, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          // Supabase REST + Realtime health-check + Storage. Network-first
          // so live data always wins, but a cached copy is served offline
          // for GETs like /profiles, /doctor_profiles.
          {
            urlPattern: ({ url }) => url.hostname.endsWith('.supabase.co'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-api',
              networkTimeoutSeconds: 8,
              expiration: { maxEntries: 80, maxAgeSeconds: 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    open: false,
    // Bind to all network interfaces so the dev server is reachable from
    // other devices on the same Wi-Fi (phones, tablets). Vite will print a
    // "Network" URL like http://192.168.x.x:5173 at boot — open that on
    // your phone. Only affects local development; production builds are
    // served by Vercel / whatever host you deploy to.
    host: true,
  },
});
