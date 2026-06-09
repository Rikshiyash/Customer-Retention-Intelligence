/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#FFFFFF',
        surface: '#F8FAFC',
        border: '#E2E8F0',
        foreground: '#0F172A',
        muted: '#64748B',
        accent: {
          DEFAULT: '#2563EB',
          hover: '#1D4ED8',
          light: '#EFF6FF',
          foreground: '#FFFFFF',
        },
        success: {
          DEFAULT: '#22C55E',
          light: '#F0FDF4',
          foreground: '#15803D',
        },
        warning: {
          DEFAULT: '#F59E0B',
          light: '#FFFBEB',
          foreground: '#B45309',
        },
        danger: {
          DEFAULT: '#EF4444',
          light: '#FEF2F2',
          foreground: '#DC2626',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgb(0 0 0 / 0.07), 0 1px 2px -1px rgb(0 0 0 / 0.07)',
        'card-hover': '0 4px 6px -1px rgb(0 0 0 / 0.08), 0 2px 4px -2px rgb(0 0 0 / 0.08)',
        'dropdown': '0 4px 16px -2px rgb(0 0 0 / 0.12), 0 2px 6px -2px rgb(0 0 0 / 0.08)',
        'sidebar': '1px 0 0 0 #E2E8F0',
      },
      borderRadius: {
        'xl': '12px',
        '2xl': '16px',
      },
    },
  },
  plugins: [],
}
