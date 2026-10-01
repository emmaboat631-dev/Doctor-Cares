import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { markOnboardingSeen } from '@/lib/onboarding';

/**
 * Force this page to always render in LIGHT mode by peeling the `.dark`
 * class off <html> while the component is mounted, then restoring it on
 * unmount. Cheaper than sprinkling inline overrides across every child.
 */
function useForceLightTheme() {
  useEffect(() => {
    const root = document.documentElement;
    const wasDark = root.classList.contains('dark');
    if (wasDark) root.classList.remove('dark');
    return () => { if (wasDark) root.classList.add('dark'); };
  }, []);
}

/* ---------------------------------------------------------------------------
 * Onboarding — matches the "Book / Find / Consult" reference:
 *  - Big illustration filling the top ~55% of the screen
 *  - Bold two-line title, one short sentence body
 *  - Small dot indicators (current one wider + dark)
 *  - Blue gradient "Get Started" pill button
 *  - Swipeable with iOS spring transitions + elastic edges
 * ------------------------------------------------------------------------- */

interface Slide {
  image: string;
  fallback?: string;
  title: string;
  body: string;
}

const SLIDES: Slide[] = [
  {
    image:    '/onboarding/slide-1.png',
    fallback: '/brand-illustration.png',
    title:    'Book an\nAppointment',
    body:     'Consult trusted doctors anytime, from anywhere — no queues, no waiting rooms.',
  },
  {
    image:    '/onboarding/slide-2.png',
    fallback: '/brand-illustration.png',
    title:    'Find your\nPerfect Doctor',
    body:     'Browse verified specialists, read real reviews, and pick the doctor that fits you.',
  },
  {
    image:    '/onboarding/slide-3.png',
    fallback: '/brand-illustration.png',
    title:    'Doctor\nConsultation',
    body:     'Video visits and secure chat, right from your phone. Care that fits your day.',
  },
];

const SPRING = 'cubic-bezier(0.32, 0.72, 0, 1)';

export function OnboardingPage() {
  useForceLightTheme();
  const [idx, setIdx] = useState(0);
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const startX = useRef(0);
  const startedInside = useRef(false);
  const navigate = useNavigate();

  const width = useCallback(() => trackRef.current?.clientWidth ?? window.innerWidth, []);

  const clampedDragX = useMemo(() => {
    const w = width();
    if ((idx === 0 && dragX > 0) || (idx === SLIDES.length - 1 && dragX < 0)) {
      return Math.sign(dragX) * Math.min(Math.abs(dragX) * 0.35, w * 0.15);
    }
    return dragX;
  }, [dragX, idx, width]);

  const goTo = useCallback((next: number) => {
    setIdx(Math.max(0, Math.min(SLIDES.length - 1, next)));
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    startedInside.current = true;
    startX.current = e.clientX;
    setDragging(true);
    setDragX(0);
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!startedInside.current) return;
    setDragX(e.clientX - startX.current);
  };
  const onPointerEnd = () => {
    if (!startedInside.current) return;
    startedInside.current = false;
    const w = width();
    const threshold = w * 0.18;
    setDragging(false);
    if (dragX < -threshold) goTo(idx + 1);
    else if (dragX > threshold) goTo(idx - 1);
    setDragX(0);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') goTo(idx + 1);
      if (e.key === 'ArrowLeft')  goTo(idx - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [idx, goTo]);

  const isLast = idx === SLIDES.length - 1;
  const trackOffset = -idx * width() + clampedDragX;

  const handleNext = () => {
    if (isLast) {
      markOnboardingSeen();
      navigate('/register');
    } else {
      goTo(idx + 1);
    }
  };

  const handleSkip = () => {
    markOnboardingSeen();
    navigate('/login');
  };

  return (
    <div className="min-h-dvh flex flex-col bg-white dark:bg-slate-950 overflow-hidden select-none onboarding-scene-in">
      {/* Top bar — Skip only, keep it minimal like the reference */}
      <div className="flex items-center justify-end px-5 pt-4 safe-top">
        <button
          type="button"
          onClick={handleSkip}
          className="text-sm font-semibold text-ink-muted hover:text-ink dark:hover:text-ink-onDark transition"
        >
          Skip
        </button>
      </div>

      {/* Slides track */}
      <div
        ref={trackRef}
        className="flex-1 relative touch-pan-y overflow-hidden"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
      >
        <div
          className="absolute inset-0 flex will-change-transform"
          style={{
            transform: `translate3d(${trackOffset}px, 0, 0)`,
            transition: dragging ? 'none' : `transform 520ms ${SPRING}`,
          }}
        >
          {SLIDES.map((s, i) => {
            // Replay entry animations whenever this becomes the active slide,
            // and skip animation entirely while the user is dragging.
            const isActive = i === idx;
            const animKey = `${i}-${idx}`;
            return (
              <section
                key={i}
                className="w-full shrink-0 h-full flex flex-col items-center px-8 pt-4 pb-4 overflow-hidden"
                aria-hidden={i !== idx}
              >
                {/* Illustration — floats + fades in when active */}
                <div className="flex-[3] w-full flex items-center justify-center min-h-0">
                  <img
                    key={dragging ? `d-${i}` : `illus-${animKey}`}
                    src={s.image}
                    alt=""
                    className={cn(
                      'max-h-full max-w-full w-auto h-auto object-contain',
                      isActive && !dragging && 'ob-illus-in',
                    )}
                    onError={(e) => {
                      const el = e.currentTarget;
                      if (s.fallback && el.src !== window.location.origin + s.fallback) {
                        el.src = s.fallback;
                      }
                    }}
                    draggable={false}
                  />
                </div>

                {/* Copy — staggered title + body */}
                <div className="flex-[2] w-full max-w-sm text-center flex flex-col items-center justify-start pt-6">
                  <h2
                    key={dragging ? `dt-${i}` : `title-${animKey}`}
                    className={cn(
                      'whitespace-pre-line text-[28px] leading-[1.15] font-bold tracking-tight text-ink dark:text-ink-onDark',
                      isActive && !dragging && 'ob-title-in',
                    )}
                  >
                    {s.title}
                  </h2>
                  <p
                    key={dragging ? `db-${i}` : `body-${animKey}`}
                    className={cn(
                      'mt-4 text-[15px] leading-relaxed text-ink-muted max-w-xs',
                      isActive && !dragging && 'ob-body-in',
                    )}
                  >
                    {s.body}
                  </p>
                </div>
              </section>
            );
          })}
        </div>
      </div>

      {/* Dot indicators */}
      <div className="flex items-center justify-center gap-2 pb-5">
        {SLIDES.map((_, i) => {
          const active = i === idx;
          return (
            <button
              key={i}
              type="button"
              aria-label={`Go to slide ${i + 1}`}
              aria-current={active ? 'true' : undefined}
              onClick={() => goTo(i)}
              className={cn(
                'h-2 rounded-full transition-all',
                active ? 'w-6 bg-brand-500' : 'w-2 bg-slate-300 dark:bg-slate-700',
              )}
              style={{ transitionDuration: '360ms', transitionTimingFunction: SPRING }}
            />
          );
        })}
      </div>

      {/* Gradient "Get Started" button */}
      <div className="px-6 pb-6 safe-bottom">
        <button
          type="button"
          onClick={handleNext}
          className={cn(
            'w-full h-14 rounded-full',
            'bg-gradient-to-b from-brand-400 to-brand-600',
            'text-white font-bold text-[15px] tracking-wide',
            'shadow-lg shadow-brand-500/30',
            'active:scale-[0.98] transition-transform',
          )}
        >
          {isLast ? 'Get Started' : 'Continue'}
        </button>
        <div className="mt-3 text-center text-xs text-ink-muted">
          Already have an account?{' '}
          <Link to="/login" className="font-bold text-brand-600 dark:text-brand-300">Log in</Link>
        </div>
      </div>
    </div>
  );
}
