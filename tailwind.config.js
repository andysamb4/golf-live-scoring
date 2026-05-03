/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'dark-green': '#1a3a1a',
        'forest-green': '#228B22',
        'light-green': '#90EE90',
        'off-white': '#F5F5F5',
        'dark-slate': '#1f2937',
        'medium-slate': '#374151',
        'light-slate': '#4b5563',
      },
    },
  },
  plugins: [],
}
