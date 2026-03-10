import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx,js,jsx,mdx}",
    "./components/**/*.{ts,tsx,js,jsx,mdx}",
    "./lib/**/*.{ts,tsx,js,jsx,mdx}",
    "./pages/**/*.{ts,tsx,js,jsx,mdx}",
    "./public/**/*.html",
  ],
  theme: {
    extend: {
      colors: {
        // Override blue shades so existing bg-blue-600 uses our primary
        blue: {
          600: "#1A0DAB",
          700: "#15099A",
        },
        // Add semantic primary token backed by CSS var for runtime theming
        primary: {
          DEFAULT: "var(--primary, #1A0DAB)",
          foreground: "var(--primary-foreground, #ffffff)",
        },
      },
    },
  },
  plugins: [],
};

export default config;
