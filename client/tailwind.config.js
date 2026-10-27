/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cosmic: {
          darkest: '#0b081d',
          dark: '#140e36',
          deep: '#1e164f',
          purple: '#2d1b69',
          lavender: '#8a65d4',
          pink: '#f472b6',
          softpink: '#fbcfe8',
          starlight: '#ffd166',
          mint: '#6ee7b7',
          cyan: '#38bdf8'
        }
      },
      fontFamily: {
        game: ['"Nunito"', 'sans-serif'],
        pixel: ['"Press Start 2P"', 'monospace']
      },
      animation: {
        'pulse-glow': 'pulseGlow 2.5s infinite ease-in-out',
        'float': 'float 3s infinite ease-in-out',
        'twinkle': 'twinkle 2s infinite ease-in-out',
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 15px rgba(244, 114, 182, 0.4), 0 0 30px rgba(138, 101, 212, 0.3)' },
          '50%': { boxShadow: '0 0 25px rgba(244, 114, 182, 0.7), 0 0 50px rgba(138, 101, 212, 0.6)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        twinkle: {
          '0%, 100%': { opacity: '0.3', transform: 'scale(0.8)' },
          '50%': { opacity: '1', transform: 'scale(1.2)' },
        }
      }
    },
  },
  plugins: [],
}
