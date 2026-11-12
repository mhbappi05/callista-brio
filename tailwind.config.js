/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        maroon: 'var(--color-primary-maroon)',
        blush: 'var(--color-secondary-blush)',
        gold: 'var(--color-accent-gold)',
        cream: 'var(--color-surface-cream)',
        ink: 'var(--color-text-dark)',
        'ink-light': 'var(--color-text-light)',
      },
      fontFamily: {
        display: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        body: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
