import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props { children: ReactNode }
interface State { error: Error | null }

/**
 * Top-level error boundary. Catches render errors from the lazy route tree
 * (chunk-load failures, crashes inside page components, etc.) and shows a
 * recoverable fallback instead of a blank screen. Without this, a bug in
 * any lazy page silently blanks the whole app.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Surface in the console so devs can see the stack trace.
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary]', error, info);
  }

  reset = () => this.setState({ error: null });

  reload = () => {
    try { sessionStorage.removeItem('dc:chunk-reloaded-at'); } catch { /* no-op */ }
    window.location.reload();
  };

  render() {
    if (!this.state.error) return this.props.children;

    const msg = String(this.state.error?.message ?? 'Unknown error');
    const isChunk = /chunkloaderror|loading chunk|dynamically imported module|failed to fetch/i.test(msg);

    return (
      <div className="min-h-dvh flex items-center justify-center bg-white dark:bg-slate-950 text-ink dark:text-ink-onDark p-6">
        <div className="max-w-md w-full text-center">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-rose-50 dark:bg-rose-500/15 text-rose-600 dark:text-rose-300 text-3xl font-bold">
            !
          </div>
          <h1 className="mt-5 text-xl font-bold tracking-tight">
            {isChunk ? 'A new version is ready.' : 'Something went wrong.'}
          </h1>
          <p className="mt-2 text-sm text-ink-soft dark:text-slate-300">
            {isChunk
              ? "The app updated while you were using it. Reload to pick up the latest version."
              : "The page couldn't load. Try again, or go back and reopen it."}
          </p>
          {!isChunk && (
            <pre className="mt-4 text-left text-[11px] text-rose-500 bg-rose-50 dark:bg-rose-500/10 rounded-lg p-3 overflow-x-auto max-h-32">{msg}</pre>
          )}
          <div className="mt-5 flex flex-col gap-2">
            <button type="button" onClick={this.reload}
              className="h-11 rounded-xl bg-brand-500 text-white text-sm font-bold hover:bg-brand-600">
              Reload the app
            </button>
            {!isChunk && (
              <button type="button" onClick={this.reset}
                className="h-11 rounded-xl border border-slate-300 dark:border-slate-700 text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-800">
                Try again
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }
}
