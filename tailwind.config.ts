import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Vazirmatn', 'system-ui', 'sans-serif'],
      },
      colors: {
        surface: {
          950: '#0a0a0a',
          900: '#121212',
          800: '#1d1d1d',
        },
      },
    },
  },
  darkMode: 'class',
  plugins: [],
} satisfies Config;
