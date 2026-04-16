import type { Config } from 'tailwindcss'

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'neon-blue': '#00D9FF',
        'neon-violet': '#D946EF',
        'dark-bg': '#0F172A',
        'dark-card': '#1E293B',
        'dark-border': '#334155',
      },
      backgroundImage: {
        'gradient-neon': 'linear-gradient(135deg, #00D9FF 0%, #D946EF 100%)',
      },
      boxShadow: {
        'glow': '0 0 20px rgba(0, 217, 255, 0.3)',
        'glow-violet': '0 0 20px rgba(217, 70, 239, 0.3)',
      },
    },
  },
  plugins: [],
} satisfies Config
