/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Outfit', 'sans-serif'],
        serif: ['Outfit', 'sans-serif'], // Remapping serif to Outfit so we don't have to change all files immediately, but it removes the fancy serif look
      },
      colors: {
        eco: {
          50: '#edf5f0',
          100: '#d2e6d9',
          200: '#abd0b9',
          300: '#7cb592',
          400: '#52976d',
          500: '#347c50',
          600: '#26623e',
          700: '#204f34',
          800: '#1a3f2a',
          900: '#153322', 
          950: '#0b1e13',
        },
        accent: '#166534',
      },
      backgroundImage: {
        'grid-pattern': `linear-gradient(to right, rgba(21, 51, 34, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(21, 51, 34, 0.05) 1px, transparent 1px)`,
      },
      backgroundSize: {
        'grid-size': '4rem 4rem',
      }
    },
  },
  plugins: [],
}
