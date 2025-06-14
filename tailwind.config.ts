import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: 'class',
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  prefix: '',
  theme: {
    // All theme extensions are now defined directly in globals.css with @theme
  },
  plugins: [require('tailwindcss-animate')],
} satisfies Config;

export default config; 