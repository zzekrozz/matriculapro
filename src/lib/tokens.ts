/**
 * Tokens de diseño del sistema MatriculaPRO
 * Sincronizados con tailwind.config.js y globals.css
 */

export const tokens = {
  color: {
    bg: '#F4F6FA',
    bgDeep: '#ECF0F6',
    surface: '#FFFFFF',
    surfaceAlt: '#FAFBFD',
    ink: '#0B1F3A',
    inkSoft: '#3A4A63',
    muted: '#7A869A',
    mutedSoft: '#B4BECE',
    line: '#E4E9F2',
    lineSoft: '#EEF2F7',
    accent: '#C8862E',
    accentSoft: '#F5E9D4',
    accentDeep: '#9C661E',
    ok: '#1F7A4D',
    okSoft: '#DEF1E5',
    warn: '#B8741A',
    warnSoft: '#FBEAD0',
    danger: '#A8341C',
    dangerSoft: '#F7DCD4',
  },
  shadow: {
    sm: '0 1px 2px rgba(11, 31, 58, 0.04)',
    md: '0 4px 14px rgba(11, 31, 58, 0.06), 0 1px 3px rgba(11, 31, 58, 0.04)',
    lg: '0 18px 40px rgba(11, 31, 58, 0.08), 0 4px 10px rgba(11, 31, 58, 0.04)',
    xl: '0 32px 80px rgba(11, 31, 58, 0.14)',
    card3d: '0 30px 60px -20px rgba(11, 31, 58, 0.35), 0 8px 20px -10px rgba(11, 31, 58, 0.18)',
  },
  font: {
    serif: '"Instrument Serif", serif',
    sans: '"Geist", system-ui, sans-serif',
    mono: '"JetBrains Mono", monospace',
  },
} as const;

export type Tokens = typeof tokens;
