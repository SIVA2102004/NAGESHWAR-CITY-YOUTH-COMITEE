import type { Config } from 'tailwindcss'
import forms from '@tailwindcss/forms'

const config: Config = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        saffron: {
          50:  '#fff9f0',
          100: '#fff3e0',
          200: '#ffe0b2',
          300: '#ffcc80',
          400: '#ffb74d',
          500: '#ff9800',
          600: '#fb8c00',
          700: '#f57c00',
          800: '#e65100',
          900: '#bf360c',
        },
        gold: {
          50:  '#fffdf0',
          100: '#fffbe6',
          200: '#fff3bf',
          300: '#ffe896',
          400: '#ffd740',
          500: '#ffc107',
          600: '#ffab00',
          700: '#ff8f00',
          800: '#ff6f00',
          900: '#e65100',
        },
        festival: {
          primary:   '#f57c00',
          secondary: '#ffc107',
          accent:    '#ff5722',
          dark:      '#1a1a1a',
          light:     '#fff8f0',
          cream:     '#fdf6e3',
          success:   '#4caf50',
          danger:    '#f44336',
          warning:   '#ff9800',
          info:      '#2196f3',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 2px 12px rgba(245,124,0,0.10)',
        'card-hover': '0 6px 24px rgba(245,124,0,0.18)',
      },
    },
  },
  plugins: [forms],
}

export default config
