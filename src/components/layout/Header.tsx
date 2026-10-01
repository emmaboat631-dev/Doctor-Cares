import type { ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell, Moon, Sun } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useTheme } from '@/contexts/ThemeContext';
import { BrandMark } from '@/components/ui/BrandMark';

interface HeaderProps {
  title?: string;
  showBack?: boolean;
  showLogo?: boolean;
  right?: ReactNode;
  onBack?: () => void;
  className?: string;
}

export function Header({ title, showBack, showLogo, right, onBack, className }: HeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { effective, setMode } = useTheme();

  const handleBack = onBack ?? (() => {
    if (window.history.length > 1) navigate(-1);
    else navigate('/');
  });

  const toggleTheme = () => setMode(effective === 'dark' ? 'light' : 'dark');

  return (
    <header
      className={cn(
        'sticky top-0 z-20 bg-white/85 dark:bg-slate-950/85 backdrop-blur',
        'border-b border-slate-200/70 dark:border-slate-800 safe-top',
        className,
      )}
    >
      <div className="mx-auto flex h-14 max-w-3xl items-center gap-3 px-4">
        {showBack ? (
          <button
            type="button"
            onClick={handleBack}
            aria-label="Go back"
            className="grid h-9 w-9 place-items-center rounded-full border border-slate-200 dark:border-slate-800 text-ink dark:text-ink-onDark"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
        ) : showLogo ? (
          <Link to="/" aria-label="Doctor Cares home" className="flex items-center gap-2">
            <BrandMark size="xs" />
            <span className="font-semibold">Doctor Cares</span>
          </Link>
        ) : null}
        {title && <h1 className="min-w-0 truncate text-base font-semibold">{title}</h1>}
        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={effective === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            className="grid h-9 w-9 place-items-center rounded-full text-ink-muted hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            {effective === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <Link
            to="/notifications"
            aria-label="Notifications"
            aria-current={location.pathname === '/notifications' ? 'page' : undefined}
            className="grid h-9 w-9 place-items-center rounded-full text-ink-muted hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <Bell className="h-4 w-4" />
          </Link>
          {right}
        </div>
      </div>
    </header>
  );
}
