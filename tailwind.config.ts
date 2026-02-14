import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'deep-space': '#0a0a0f',
        'charcoal': '#141418',
        'gunmetal': '#1e1e24',
        'steel-dark': '#2a2a32',
        'steel-mid': '#3a3a44',
        'steel-light': '#4a4a56',
        'jarvis-gold': '#F59E0B',
        'jarvis-amber': '#D97706',
        'jarvis-warm': '#FBBF24',
        'text-primary': '#e0e0e8',
        'text-secondary': '#9090a0',
        'text-muted': '#606070',
        'success': '#00e88c',
        'warning': '#e8a800',
        'error': '#e84040',
      },
      fontFamily: {
        'orbitron': ['Orbitron', 'sans-serif'],
        'inter': ['Inter', 'system-ui', 'sans-serif'],
        'jetbrains': ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        'glow-sm': '0 0 15px rgba(245, 158, 11, 0.12)',
        'glow-md': '0 0 20px rgba(245, 158, 11, 0.25)',
        'glow-lg': '0 0 30px rgba(245, 158, 11, 0.4)',
      },
      animation: {
        'glow-pulse': 'glowPulse 2s ease-in-out infinite',
        'listening-pulse': 'listeningPulse 1.5s ease-in-out infinite',
      },
      keyframes: {
        glowPulse: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(245, 158, 11, 0.2)' },
          '50%': { boxShadow: '0 0 50px rgba(245, 158, 11, 0.5)' },
        },
        listeningPulse: {
          '0%, 100%': { transform: 'scale(1)', opacity: '0.6' },
          '50%': { transform: 'scale(1.08)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
