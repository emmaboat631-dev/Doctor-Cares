import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { bootstrapNative } from './lib/native/bootstrap';
import { installOfflineQueue } from './lib/offlineQueue';
import './i18n';
import './styles/index.css';

bootstrapNative();
installOfflineQueue();

// After a Vercel redeploy the old HTML holds references to chunk filenames
// that no longer exist. The lazy() import then throws silently and the
// Suspense renders a blank screen. Catching Vite's preload error (and the
// equivalent native 'ChunkLoadError') and doing a one-shot reload gets the
// user onto the latest bundle without them having to figure out hard-refresh.
if (typeof window !== 'undefined') {
  const RELOAD_FLAG = 'dc:chunk-reloaded-at';
  const reloadOnce = () => {
    try {
      const last = Number(sessionStorage.getItem(RELOAD_FLAG) ?? '0');
      // Don't thrash: if we already reloaded in the last 30s, surface the error
      // instead so the user sees SOMETHING rather than an infinite reload loop.
      if (Date.now() - last < 30_000) return;
      sessionStorage.setItem(RELOAD_FLAG, String(Date.now()));
    } catch { /* storage disabled → still try the reload */ }
    window.location.reload();
  };
  window.addEventListener('vite:preloadError', (e) => { e.preventDefault(); reloadOnce(); });
  window.addEventListener('error', (e) => {
    const msg = String(e?.message ?? '');
    if (/ChunkLoadError|Loading chunk|dynamically imported module/i.test(msg)) reloadOnce();
  });
  window.addEventListener('unhandledrejection', (e) => {
    const reason = e?.reason;
    const msg = String(reason?.message ?? reason ?? '');
    if (/ChunkLoadError|Loading chunk|dynamically imported module|Failed to fetch dynamically imported/i.test(msg)) reloadOnce();
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);
