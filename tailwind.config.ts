import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Approved-skin tokens (mockup legend): the ONE border color and the
        // ONE secondary-text color used across all (app) screens.
        line: '#e2eaf5', // card/row borders
        steel: '#4a6690', // secondary/descriptive text + kickers
        // Brand-navy ramp anchored on #003087 — overrides Tailwind's default
        // blue so every existing `blue-*` utility resolves to brand colors.
        blue: {
          50: '#eef4fb',
          100: '#d9e6f7',
          200: '#b3cdee',
          300: '#86aede',
          400: '#6694d3',
          500: '#4f7ac7',
          600: '#2f5fb3',
          700: '#1a4a9e', // links
          800: '#003087', // BRAND PRIMARY
          900: '#00205c', // pressed/hover dark
          950: '#000f2e',
        },
        primary: {
          DEFAULT: '#003087', // HVAC Navy (Carrier/ESCO standard)
          50: '#eef3ff',
          100: '#d9e4ff',
          200: '#b3c8ff',
          300: '#7da2ff',
          400: '#4a73ff',
          500: '#1a45ff',
          600: '#0033e6',
          700: '#0029cc',
          800: '#003087',
          900: '#001d57',
          950: '#000f2e',
        },
        accent: {
          DEFAULT: '#16a34a', // green-600
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
          950: '#052e16',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        // Fraunces — screen titles + hero moments ONLY (approved skin)
        serif: ['var(--font-fraunces)', 'Georgia', 'serif'],
        // JetBrains Mono — big stat numbers (readiness %, tile %s, pace, timer, XP)
        mono: ['var(--font-jetbrains-mono)', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      borderRadius: {
        '4xl': '2rem',
      },
      boxShadow: {
        // Approved-skin card shadow (mockup legend)
        card: '0 2px 8px rgba(15,31,61,.06)',
      },
    },
  },
  plugins: [],
}

export default config
