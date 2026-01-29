/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'Kanit', 'sans-serif'], // รองรับฟอนต์ไทย
      },
      animation: {
        'fade-in': 'fadeIn 0.8s ease-out forwards',
        'zoom-in': 'zoomIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'shake': 'shake 0.5s cubic-bezier(.36,.07,.19,.97) both infinite',
        'pulse-glow': 'pulse-glow 3s infinite',
        'float': 'float 3s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: 0, transform: 'translateY(20px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
        zoomIn: {
          '0%': { opacity: 0, transform: 'scale(0.90)' },
          '100%': { opacity: 1, transform: 'scale(1)' },
        },
        shake: {
          '10%, 90%': { transform: 'translate3d(-1px, 0, 0)' },
          '20%, 80%': { transform: 'translate3d(2px, 0, 0)' },
          '30%, 50%, 70%': { transform: 'translate3d(-4px, 0, 0)' },
          '40%, 60%': { transform: 'translate3d(4px, 0, 0)' }
        },
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(245, 158, 11, 0)', filter: 'brightness(1)' },
          '50%': { boxShadow: '0 0 30px rgba(245, 158, 11, 0.3)', filter: 'brightness(1.2)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        }
      }
    },
  },
  plugins: [],
}