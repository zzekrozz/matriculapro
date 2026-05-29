/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: '#F4F6FA',
        'bg-deep': '#ECF0F6',
        surface: '#FFFFFF',
        'surface-alt': '#FAFBFD',
        ink: '#0B1F3A',
        'ink-soft': '#3A4A63',
        muted: '#7A869A',
        'muted-soft': '#B4BECE',
        line: '#E4E9F2',
        'line-soft': '#EEF2F7',
        accent: '#C8862E',
        'accent-soft': '#F5E9D4',
        'accent-deep': '#9C661E',
        ok: '#1F7A4D',
        'ok-soft': '#DEF1E5',
        warn: '#B8741A',
        'warn-soft': '#FBEAD0',
        danger: '#A8341C',
        'danger-soft': '#F7DCD4',
      },
      fontFamily: {
        serif: ['"Instrument Serif"', 'serif'],
        sans: ['"Geist"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        'soft-sm': '0 1px 2px rgba(11, 31, 58, 0.04)',
        'soft-md': '0 4px 14px rgba(11, 31, 58, 0.06), 0 1px 3px rgba(11, 31, 58, 0.04)',
        'soft-lg': '0 18px 40px rgba(11, 31, 58, 0.08), 0 4px 10px rgba(11, 31, 58, 0.04)',
        'soft-xl': '0 32px 80px rgba(11, 31, 58, 0.14)',
      },
    },
  },
  plugins: [],
};
