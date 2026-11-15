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
      boxShadow: {
        float: '0 10px 30px -12px rgb(var(--rgb-maroon) / 0.28), 0 2px 8px rgb(var(--rgb-maroon) / 0.08)',
        'float-lg': '0 22px 44px -14px rgb(var(--rgb-maroon) / 0.38), 0 4px 14px rgb(var(--rgb-maroon) / 0.12)',
      },
    },
  },
  plugins: [],
}