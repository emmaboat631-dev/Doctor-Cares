import { cn } from '@/lib/cn';

interface BrandMarkProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizes = {
  xs: 'h-8 w-8',
  sm: 'h-10 w-10',
  md: 'h-14 w-14',
  lg: 'h-20 w-20',
  xl: 'h-32 w-32',
};

/**
 * The Doctor Cares brand illustration used as the app mark.
 * Rendered as a plain image so its full detail comes through — no framing,
 * so the illustration's own background reads as the shape.
 */
export function BrandMark({ size = 'sm', className }: BrandMarkProps) {
  return (
    <img
      src="/brand-illustration.png"
      alt="Doctor Cares"
      className={cn('object-contain select-none', sizes[size], className)}
      draggable={false}
    />
  );
}
