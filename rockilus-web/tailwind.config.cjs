/** CommonJS fallback for Tailwind to ensure config is loaded in all environments */
module.exports = {
  content: [
    './app/**/*.{ts,tsx,js,jsx,mdx}',
    './components/**/*.{ts,tsx,js,jsx,mdx}',
    './lib/**/*.{ts,tsx,js,jsx,mdx}',
    './pages/**/*.{ts,tsx,js,jsx,mdx}',
    './public/**/*.html',
  ],
  theme: {
    extend: {
      colors: {
        blue: {
          600: '#1A0DAB',
          700: '#15099A',
        },
        primary: {
          DEFAULT: 'var(--primary, #1A0DAB)',
          foreground: 'var(--primary-foreground, #ffffff)'
        }
      }
    }
  },
  plugins: [],
}
