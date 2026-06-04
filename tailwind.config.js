/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./*.html'],
  theme: {
    extend: {
      colors: {
        atx: {
          teal: '#2a9d8f',
          tealLight: '#e8f5f3',
          tealDark: '#1e7268',
          orange: '#e76f51',
          orangeLight: '#fdf0ed',
          cream: '#fefae0',
          sand: '#e9e5d6',
        },
        warm: {
          50: '#fdfcf9',
          100: '#f9f6f0',
          200: '#f0ebe0',
          300: '#d4cfc2',
          400: '#b8b0a0',
          500: '#9c937f',
          600: '#7a7265',
          700: '#5c5346',
          800: '#3d382f',
          900: '#2a2620',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
