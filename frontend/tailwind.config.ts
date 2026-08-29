import type { Config } from 'tailwindcss';

export default {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: '#062650',
        cyan: '#175cd3',
        brandRed: '#e31b23',
        surface: '#f6f8fb',
      },
      boxShadow: {
        panel: '0 1px 2px rgba(6, 38, 80, 0.04), 0 10px 28px rgba(6, 38, 80, 0.05)',
      },
    },
  },
  plugins: [],
} satisfies Config;
