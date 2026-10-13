/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: '#ef4444',
        'brand-dark': '#b91c1c'
      }
    }
  },
  plugins: []
}
