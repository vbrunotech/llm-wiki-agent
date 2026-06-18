/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        base:            'rgb(var(--color-base) / <alpha-value>)',
        surface:         'rgb(var(--color-surface) / <alpha-value>)',
        raised:          'rgb(var(--color-raised) / <alpha-value>)',
        hover:           'rgb(var(--color-hover) / <alpha-value>)',
        overlay:         'rgb(var(--color-overlay) / <alpha-value>)',
        heading:         'rgb(var(--color-heading) / <alpha-value>)',
        body:            'rgb(var(--color-body) / <alpha-value>)',
        muted:           'rgb(var(--color-muted) / <alpha-value>)',
        faint:           'rgb(var(--color-faint) / <alpha-value>)',
        border:          'rgb(var(--color-border) / <alpha-value>)',
        'border-subtle': 'rgb(var(--color-border-subtle) / <alpha-value>)',
        link:            'rgb(var(--color-link) / <alpha-value>)',
        'link-hover':    'rgb(var(--color-link-hover) / <alpha-value>)',
      },
    },
  },
  plugins: [],
}
