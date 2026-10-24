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
      // The radius scale from
      // skills/cemurm-visual-system/references/apple-macos-visual-language.md
      // section 5.2. Every value is a `var()` so the custom properties declared
      // in src/app/index.css are the single source of truth.
      //
      // `cem-*` names, NOT Tailwind's default steps: `rounded-md` is 6px while
      // section 5.2's `radius-md` is 12px, so reusing the default names would
      // ship a third of the intended radius under a class that reads correct.
      // Full rationale, the per-token component classes and the 4px/28px stage
      // scale that is deliberately NOT encoded here live beside the properties.
      //
      // `cem-full` is absent on purpose — `rounded-full` already exists at
      // exactly 9999px and is already the sanctioned capsule, so a second name
      // would be a synonym with no owner.
      borderRadius: {
        'cem-xs': 'var(--cem-radius-xs)',
        'cem-sm': 'var(--cem-radius-sm)',
        'cem-md': 'var(--cem-radius-md)',
        'cem-lg': 'var(--cem-radius-lg)',
        'cem-xl': 'var(--cem-radius-xl)',
      },
    },
  },
  plugins: [],
}