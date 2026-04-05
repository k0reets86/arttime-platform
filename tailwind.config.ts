import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'primary': '#5d3fd3', 'primary-dim': '#5130c6', 'primary-fixed': '#a391ff',
        'primary-container': '#a391ff', 'on-primary': '#f6f0ff',
        'on-primary-container': '#230076', 'inverse-primary': '#937dff',
        'secondary': '#6c5a00', 'secondary-container': '#ffd709',
        'secondary-fixed': '#ffd709', 'on-secondary': '#fff2cd',
        'on-secondary-container': '#5b4b00',
        'tertiary': '#725800', 'tertiary-container': '#fccc38', 'on-tertiary': '#fff1d7',
        'background': '#f5f6f7', 'surface': '#f5f6f7', 'surface-dim': '#d1d5d7',
        'surface-variant': '#dadddf', 'surface-container-lowest': '#ffffff',
        'surface-container-low': '#eff1f2', 'surface-container': '#e6e8ea',
        'surface-container-high': '#e0e3e4', 'surface-container-highest': '#dadddf',
        'surface-tint': '#5d3fd3', 'on-surface': '#2c2f30',
        'on-surface-variant': '#595c5d', 'inverse-surface': '#0c0f10',
        'outline': '#757778', 'outline-variant': '#abadae',
        'error': '#b41340', 'error-container': '#f74b6d', 'on-error': '#ffefef',
      },
      fontFamily: {
        'headline': ['Epilogue', 'sans-serif'],
        'body': ['Be Vietnam Pro', 'sans-serif'],
        'sans': ['Be Vietnam Pro', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '1rem', 'sm': '0.5rem', 'md': '0.75rem',
        'lg': '2rem', 'xl': '3rem', 'full': '9999px',
      },
      boxShadow: {
        'radiant': '0 40px 60px -15px rgba(93,63,211,0.12)',
        'radiant-sm': '0 20px 40px -10px rgba(93,63,211,0.08)',
      },
      keyframes: {
        bounce: {
          '0%, 100%': { transform: 'scaleY(0.4)' },
          '50%': { transform: 'scaleY(1)' },
        },
      },
      animation: {
        bounce: 'bounce 0.6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
export default config
