import { cn } from '@/lib/cn';

interface AvatarProps {
  name?: string | null;
  src?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizes = {
  xs: 'h-6 w-6 text-[10px]',
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-base',
  xl: 'h-20 w-20 text-lg',
};

const initialsOf = (name?: string | null) => {
  if (!name) return '·';
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('') || '·';
};

export function Avatar({ name, src, size = 'md', className }: AvatarProps) {
  return (
    <div
      className={cn(
        'inline-flex select-none items-center justify-center overflow-hidden rounded-full',
        'bg-brand-100 text-brand-700 dark:bg-brand-500/20 dark:text-brand-200 font-semibold',
        sizes[size],
        className,
      )}
      aria-hidden={!name}
    >
      {src ? (
        <img src={src} alt={name ?? ''} className="h-full w-full object-cover" />
      ) : (
        <span>{initialsOf(name)}</span>
      )}
    </div>
  );
}
