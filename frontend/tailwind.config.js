/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        'risk-critical': '#ef4444',
        'risk-high': '#f97316',
        'risk-medium': '#eab308',
        'risk-low': '#3b82f6',
        'risk-none': '#6b7280',
      },
    },
  },
  plugins: [],
}
