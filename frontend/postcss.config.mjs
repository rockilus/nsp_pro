/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    // Use the new PostCSS wrapper package for Tailwind
    "@tailwindcss/postcss": {},
    // Add autoprefixer (recommended)
    autoprefixer: {},
  },
};

export default config;
