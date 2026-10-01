/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Brand primary — calm healthcare blue
        brand: {
          50:  '#EEF3FF',
          100: '#D9E4FF',
          200: '#B4C9FF',
          300: '#8AA8FF',
          400: '#5A82FF',
          500: '#1E5EFF', // primary
          600: '#1A4FDB',
          700: '#173FB2',
          800: '#122F87',
          900: '#0D215E',
        },
        // Secondary — soft teal for accents
        accent: {
          50:  '#EAFBF6',
          100: '#CDF3E6',
          200: '#9DE7CD',
          300: '#65D7B0',
          400: '#2FBF8F',
          500: '#0FA774',
          600: '#0A855C',
          700: '#086648',
          800: '#064932',
          900: '#03301F',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          muted:   '#F5F7FB',
          soft:    '#EEF1F7',
        },
        ink: {
          DEFAULT: '#0F172A',
          soft:    '#334155',
          muted:   '#64748B',
          faint:   '#94A3B8',
          onDark:  '#F8FAFC',
        },
        // Semantic
        success: { DEFAULT: '#16A34A', soft: '#DCFCE7' },
        warning: { DEFAULT: '#F59E0B', soft: '#FEF3C7' },
        danger:  { DEFAULT: '#DC2626', soft: '#FEE2E2' },
        info:    { DEFAULT: '#0EA5E9', soft: '#E0F2FE' },
      },
      fontFamily: {
        sans: [
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'sans-serif',
        ],
      },
      fontSize: {
        xs: ['0.75rem', { lineHeight: '1rem' }],
        sm: ['0.875rem', { lineHeight: '1.25rem' }],
        base: ['1rem', { lineHeight: '1.5rem' }],
        lg: ['1.125rem', { lineHeight: '1.75rem' }],
        xl: ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
      },
      borderRadius: {
        xl: '0.875rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        card: '0 1px 2px rgba(15, 23, 42, 0.06), 0 1px 3px rgba(15, 23, 42, 0.04)',
        pop:  '0 8px 24px rgba(15, 23, 42, 0.10)',
        nav:  '0 -4px 12px rgba(15, 23, 42, 0.06)',
      },
      spacing: {
        'safe-t': 'env(safe-area-inset-top)',
        'safe-b': 'env(safe-area-inset-bottom)',
        'safe-l': 'env(safe-area-inset-left)',
        'safe-r': 'env(safe-area-inset-right)',
      },
      screens: {
        xs: '375px',
      },
      keyframes: {
        'fade-in':  { from: { opacity: '0' }, to: { opacity: '1' } },
        'slide-up': { from: { transform: 'translateY(8px)', opacity: '0' }, to: { transform: 'translateY(0)', opacity: '1' } },
        pulseBg:    { '0%,100%': { backgroundColor: 'rgba(148,163,184,0.15)' }, '50%': { backgroundColor: 'rgba(148,163,184,0.35)' } },
      },
      animation: {
        'fade-in':  'fade-in 200ms ease-out both',
        'slide-up': 'slide-up 260ms cubic-bezier(0.2, 0.7, 0.2, 1) both',
        'skeleton': 'pulseBg 1.4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
