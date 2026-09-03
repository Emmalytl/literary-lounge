/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#F6F1E7',
        'paper-dark': '#12161F',
        ink: '#1B2A4A',
        'ink-dark': '#E7E2D6',
        gold: '#B78A3D',
        clay: '#8C4A3B'
      },
      fontFamily: {
        display: ['"Playfair Display"', 'Georgia', 'serif'],
        sans: ['"Inter"', 'system-ui', 'sans-serif']
      },
      maxWidth: { prose: '68ch' }
    }
  },
  darkMode: 'class',
  plugins: []
}
