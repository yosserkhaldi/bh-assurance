import type { Config } from 'tailwindcss';

export default {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: '#0b1f3a',
        cyan: '#00a6b2',
        surface: '#f4f7f9',
      },
    },
  },
  plugins: [],
} satisfies Config;
