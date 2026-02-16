/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class', // Habilita el modo oscuro por clase
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      colors: {
        chefly: {
          orange: '#F97316', // Tu naranja de acento
          gray: '#F8FAFC',
        },
        dark: {
          bg: '#0F172A',         // Fondo principal
          card: '#1E293B',       // Fondos secundarios
          border: '#334155',     // Bordes sutiles
          text: '#F9FAFB',       // Texto principal
          secondary: '#9CA3AF',  // Texto secundario
          muted: '#6B7280',      // Texto deshabilitado
        },
        accent: {
          success: '#22C55E',
          warning: '#FACC15',
          info: '#3B82F6',
        }
      }
    },
  },
  plugins: [],
}