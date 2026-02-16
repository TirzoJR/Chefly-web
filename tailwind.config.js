/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class', // Habilita el cambio por clase .dark
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      colors: {
        chefly: {
          orange: '#FF6B00',
          dark: '#0F172A',
          gray: '#F8FAFC',
        },
        
        dark: {
          bg: 'oklch(0.145 0 0)',
          card: 'oklch(0.145 0 0)',
          elevated: 'oklch(0.269 0 0)',
          border: 'oklch(0.269 0 0)',
          text: 'oklch(0.985 0 0)',
          secondary: 'oklch(0.708 0 0)',
        }
      }
    },
  },
  plugins: [],
}