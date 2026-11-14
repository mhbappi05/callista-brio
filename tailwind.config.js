/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        maroon: 'rgb(var(--rgb-maroon) / <alpha-value>)',
        blush: 'rgb(var(--rgb-blush) / <alpha-value>)',
        gold: 'rgb(var(--rgb-gold) / <alpha-value>)',
        cream: 'rgb(var(--rgb-cream) / <alpha-value>)',
        ink: 'rgb(var(--rgb-ink) / <alpha-value>)',
        'ink-light': 'rgb(var(--rgb-ink-light) / <alpha-value>)',
      },
      fontFamily: {
        display: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        body: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
