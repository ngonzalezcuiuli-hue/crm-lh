/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Paleta de colores estructurada
        primary: {
          DEFAULT: '#1D4FFF', // primary-blue
          light: '#4C6FFF',  // sky-signal-blue
        },
        dark: {
          DEFAULT: '#0F172A', // abyss-navy
        },
        accent: {
          DEFAULT: '#FF5A1F', // beacon-orange
        },
        neutral: {
          light: '#CBD5E1', // light-gray
          DEFAULT: '#64748B', // Un gris intermedio para texto
          dark: '#334155', // Un gris más oscuro
        }
        // Puedes agregar más colores como 'success', 'danger', 'warning' aquí
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Manrope', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}

