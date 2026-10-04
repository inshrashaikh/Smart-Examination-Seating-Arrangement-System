/** @type {import('tailwindcss').Config} */

/** Convert `#RRGGBB` to "R G B" channel triplet (used for `<alpha-value>` colours). */
const toRgb = (hex) => {
  const clean = hex.replace('#', '');
  return [
    parseInt(clean.slice(0, 2), 16),
    parseInt(clean.slice(2, 4), 16),
    parseInt(clean.slice(4, 6), 16),
  ].join(' ');
};

/**
 * Build a Tailwind colour entry that supports BOTH:
 *   - the classic 50..950 shade scale  -> `bg-primary-600`
 *   - low alpha steps 10/20/30/40      -> `bg-primary-20`
 *   - the slash opacity modifier       -> `bg-primary/60` (resolved via DEFAULT)
 *   - explicit `rgb` channel accessor  -> `rgb(var(--x))` style consumers
 *
 * @param {Record<string, string>} scale shade map, 50..950
 * @param {number} baseIndex shade used for DEFAULT
 */
const withScale = (scale, baseIndex = 600) => {
  const base = scale[baseIndex];
  const [r, g, b] = toRgb(base).split(' ');
  return {
    DEFAULT: base,
    rgb: toRgb(base),
    // Alpha steps kept below the lowest shade so they never collide with it.
    10: `rgba(${r}, ${g}, ${b}, 0.1)`,
    20: `rgba(${r}, ${g}, ${b}, 0.2)`,
    30: `rgba(${r}, ${g}, ${b}, 0.3)`,
    40: `rgba(${r}, ${g}, ${b}, 0.4)`,
    ...scale,
  };
};

// Brand: indigo #4F46E5
const primary = {
  50: '#EEF2FF',
  100: '#E0E7FF',
  200: '#C7D2FE',
  300: '#A5B4FC',
  400: '#818CF8',
  500: '#6366F1',
  600: '#4F46E5',
  700: '#4338CA',
  800: '#3730A3',
  900: '#312E81',
  950: '#1E1B4B',
};

// Brand: teal #14B8A6
const accent = {
  50: '#F0FDFA',
  100: '#CCFBF1',
  200: '#99F6E4',
  300: '#5EEAD4',
  400: '#2DD4BF',
  500: '#14B8A6',
  600: '#0D9488',
  700: '#0F766E',
  800: '#115E59',
  900: '#134E4A',
  950: '#042F2E',
};

// Brand ink: slate #0F172A
const ink = {
  50: '#F8FAFC',
  100: '#F1F5F9',
  200: '#E2E8F0',
  300: '#CBD5E1',
  400: '#94A3B8',
  500: '#64748B',
  600: '#475569',
  700: '#334155',
  800: '#1E293B',
  900: '#0F172A',
  950: '#020617',
};

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        display: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      colors: {
        primary: withScale(primary),
        accent: withScale(accent),
        surface: {
          DEFAULT: '#F8FAFC',
          dark: '#0B1120',
        },
        ink: withScale(ink, 900),
        // Department palette (used by hall plans + charts)
        dept: {
          cse: '#4F46E5',
          it: '#14B8A6',
          ece: '#F59E0B',
          mech: '#EC4899',
          civil: '#3B82F6',
        },
      },
      borderRadius: {
        '4xl': '2rem',
      },
      boxShadow: {
        soft: '0 1px 2px 0 rgb(15 23 42 / 0.04), 0 8px 24px -8px rgb(15 23 42 / 0.10)',
        'soft-lg': '0 2px 4px 0 rgb(15 23 42 / 0.04), 0 24px 48px -12px rgb(15 23 42 / 0.16)',
        glow: '0 0 0 1px rgb(79 70 229 / 0.18), 0 12px 32px -8px rgb(79 70 229 / 0.35)',
        'glow-accent': '0 0 0 1px rgb(20 184 166 / 0.20), 0 12px 32px -8px rgb(20 184 166 / 0.35)',
        inset: 'inset 0 1px 0 0 rgb(255 255 255 / 0.6)',
      },
      backdropBlur: {
        xs: '2px',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translate3d(0, 0, 0) scale(1)' },
          '50%': { transform: 'translate3d(0, -22px, 0) scale(1.05)' },
        },
        floatSlow: {
          '0%, 100%': { transform: 'translate3d(0, 0, 0)' },
          '50%': { transform: 'translate3d(18px, -26px, 0)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        blob: {
          '0%, 100%': { borderRadius: '58% 42% 47% 53% / 52% 45% 55% 48%' },
          '50%': { borderRadius: '42% 58% 61% 39% / 41% 55% 45% 59%' },
        },
        gradient: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        'pulse-ring': {
          '0%': { transform: 'scale(0.85)', opacity: '0.7' },
          '100%': { transform: 'scale(1.7)', opacity: '0' },
        },
        'seat-pop': {
          '0%': { transform: 'scale(0.4)', opacity: '0' },
          '60%': { transform: 'scale(1.12)', opacity: '1' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'draw-check': {
          '0%': { strokeDashoffset: '48' },
          '100%': { strokeDashoffset: '0' },
        },
        'marquee-x': {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
      },
      animation: {
        float: 'float 9s ease-in-out infinite',
        floatSlow: 'floatSlow 13s ease-in-out infinite',
        blob: 'blob 14s ease-in-out infinite',
        shimmer: 'shimmer 1.8s infinite',
        gradient: 'gradient 6s ease infinite',
        'pulse-ring': 'pulse-ring 2.2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'seat-pop': 'seat-pop 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
        'draw-check': 'draw-check 0.6s ease-out 0.2s forwards',
        'marquee-x': 'marquee-x 28s linear infinite',
      },
      backgroundImage: {
        'grid-slate': 'linear-gradient(to right, rgb(148 163 184 / 0.16) 1px, transparent 1px), linear-gradient(to bottom, rgb(148 163 184 / 0.16) 1px, transparent 1px)',
      },
      transitionTimingFunction: {
        spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
    },
  },
  plugins: [],
};
