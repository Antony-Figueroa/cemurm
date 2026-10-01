import defaultTheme from 'tailwindcss/defaultTheme'

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cem: {
          base: '#0f172a',
          surface: '#1e293b',
          elevated: '#334155',
          hover: '#475569',
          text: '#f8fafc',
          secondary: '#94a3b8',
          // Exists because cem.secondary fails the 4.5:1 AA text floor on
          // cem.elevated (4.04:1) and cem.hover (2.96:1). cem.secondary itself is
          // unchanged: 318 usages sit on base/surface where it clears the floor, so
          // raising the shared value would fix 16 sites by degrading 318. Added
          // rather than replaced, following the cem.stage.dim precedent: a token
          // introduced for one measured need, not a rename of an existing one.
          'secondary-elevated': '#b0bccb',
          amber: '#f59e0b',
          coral: '#f97316',
          emerald: '#10b981',
          rose: '#f43f5e',
          sky: '#0ea5e9',
          stage: {
            bg: '#000000',
            chord: '#f59e0b',
            lyric: '#f8fafc',
            section: '#94a3b8',
            dim: '#1e293b',
          },
        },
      },
      fontFamily: {
        sans: ['Inter', ...defaultTheme.fontFamily.sans],
      },
    },
  },
  plugins: [],
}