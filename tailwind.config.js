/** @type {import('tailwindcss').Config} */
module.exports = {
  // Escaneo solo del código fuente del widget.
  content: ['./src/**/*.{ts,tsx}'],
  // Preflight desactivado: el widget se inserta en GeneratePress y no debe
  // resetear los estilos globales del tema.
  corePlugins: {
    preflight: false,
  },
  theme: {
    extend: {},
  },
  plugins: [require('tailwindcss-animate')],
};
