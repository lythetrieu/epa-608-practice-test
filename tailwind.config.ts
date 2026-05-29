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
      },
      borderRadius: {
        '4xl': '2rem',
      },
    },
  },
  plugins: [],
}

export default config
