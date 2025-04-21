/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      animation: {
        'pulse': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        pulse: {
          '0%, 100%': { boxShadow: '0 0 5px rgba(255, 99, 71, 0.3)' },
          '50%': { boxShadow: '0 0 12px rgba(255, 99, 71, 0.6)' },
        },
      },
      colors: {
        tomato: {
          50: '#fff5f3',
          100: '#ffebe6',
          200: '#ffd6cc',
          300: '#ffb3a6',
          400: '#ff8a73',
          500: '#ff6347', // Primary
          600: '#ff4726',
          700: '#d62c0d',
          800: '#ab250f',
          900: '#8c2313',
          950: '#4c0f05',
        },
      },
    },
  },
  plugins: [],
}
