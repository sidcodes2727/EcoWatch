/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        primary: {
          DEFAULT: '#059669',
          50:  '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
          800: '#065f46',
          900: '#064e3b',
          950: '#022c22',
        },
        secondary: {
          DEFAULT: '#0891b2',
          50:  '#ecfeff',
          100: '#cffafe',
          200: '#a5f3fc',
          300: '#67e8f9',
          400: '#22d3ee',
          500: '#06b6d4',
          600: '#0891b2',
          700: '#0e7490',
          800: '#155e75',
          900: '#164e63',
        },
        accent: {
          DEFAULT: '#7c3aed',
          50:  '#f5f3ff',
          100: '#ede9fe',
          200: '#ddd6fe',
          300: '#c4b5fd',
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#7c3aed',
          700: '#6d28d9',
          800: '#5b21b6',
        },
        surface: {
          DEFAULT: '#f0fdf8',
          50:  '#f0fdf8',
          100: '#e8faf3',
          200: '#dcf5ec',
          300: '#c3edd9',
        },
        dark: {
          DEFAULT: '#0f1e17',
          50:  '#162c20',
          100: '#1f3a2a',
          200: '#2a4c37',
          300: '#3a6349',
        },
        card: {
          DEFAULT: '#ffffff',
          hover: '#f8fffe',
        }
      },
      animation: {
        'fade-in':         'fadeIn 0.5s ease-out both',
        'fade-in-up':      'fadeInUp 0.6s ease-out both',
        'fade-in-down':    'fadeInDown 0.5s ease-out both',
        'slide-in-right':  'slideInRight 0.4s ease-out both',
        'slide-in-left':   'slideInLeft 0.4s ease-out both',
        'scale-in':        'scaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) both',
        'pulse-slow':      'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float':           'float 6s ease-in-out infinite',
        'float-slow':      'float 9s ease-in-out infinite',
        'shimmer':         'shimmer 2s linear infinite',
        'gradient':        'gradientShift 10s ease infinite',
        'spin-slow':       'spin 3s linear infinite',
        'bounce-gentle':   'bounceGentle 2s ease-in-out infinite',
        'glow-pulse':      'glowPulse 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%':   { opacity: '0', transform: 'translateY(24px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeInDown: {
          '0%':   { opacity: '0', transform: 'translateY(-16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          '0%':   { opacity: '0', transform: 'translateX(-24px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        slideInLeft: {
          '0%':   { opacity: '0', transform: 'translateX(24px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        scaleIn: {
          '0%':   { opacity: '0', transform: 'scale(0.85)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':       { transform: 'translateY(-18px)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        gradientShift: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%':       { backgroundPosition: '100% 50%' },
        },
        bounceGentle: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%':       { transform: 'translateY(-6px)' },
        },
        glowPulse: {
          '0%, 100%': { boxShadow: '0 0 12px rgba(5,150,105,0.3)' },
          '50%':       { boxShadow: '0 0 28px rgba(5,150,105,0.6)' },
        },
      },
      boxShadow: {
        'glass':       '0 8px 32px 0 rgba(31, 38, 135, 0.12)',
        'glass-dark':  '0 8px 32px 0 rgba(0, 0, 0, 0.4)',
        'card':        '0 2px 16px -2px rgba(0,0,0,0.07), 0 1px 4px -1px rgba(0,0,0,0.04)',
        'card-hover':  '0 12px 40px -6px rgba(0,0,0,0.13), 0 4px 12px -2px rgba(0,0,0,0.07)',
        'card-lg':     '0 20px 60px -12px rgba(0,0,0,0.15), 0 8px 24px -4px rgba(0,0,0,0.08)',
        'glow-primary':'0 0 24px rgba(5, 150, 105, 0.4)',
        'glow-secondary':'0 0 24px rgba(8, 145, 178, 0.4)',
        'glow-accent': '0 0 24px rgba(124, 58, 237, 0.4)',
        'inner-sm':    'inset 0 1px 3px rgba(0,0,0,0.06)',
        'btn':         '0 4px 14px -2px rgba(5,150,105,0.35)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-mesh':   'radial-gradient(at 40% 20%, rgba(5,150,105,0.15) 0px, transparent 50%), radial-gradient(at 80% 0%, rgba(8,145,178,0.1) 0px, transparent 50%), radial-gradient(at 0% 50%, rgba(124,58,237,0.08) 0px, transparent 50%)',
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
      transitionTimingFunction: {
        'spring':      'cubic-bezier(0.34, 1.56, 0.64, 1)',
        'smooth':      'cubic-bezier(0.4, 0, 0.2, 1)',
      },
    },
  },
  plugins: [],
}
