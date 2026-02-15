/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      colors: {
        chefly: {
          orange: '#FF6B00', // Naranja Chefly
          dark: '#0F172A',   // Color oscuro botones
          gray: '#F8FAFC',   // Gris claro fondo
        }
      }
    },
  },
  plugins: [],
}