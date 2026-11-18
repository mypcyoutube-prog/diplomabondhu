export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: { DEFAULT: '#0F2A4A', 50: '#E8EEF5', 100: '#C9D8E8', 600: '#0B1F37', 700: '#081829' },
        emerald: { DEFAULT: '#10B981' },
        teal: { DEFAULT: '#14B8A6' }
      },
      fontFamily: {
        sans: ['Inter', 'Hind Siliguri', 'system-ui', 'sans-serif']
      }
    }
  },
  plugins: []
};
