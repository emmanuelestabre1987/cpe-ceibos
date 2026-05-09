/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#1E3252',
        secondary: '#2C9FC0',
        accent: '#FF6C02',
        'gray-light': '#E3E4E4',
        'text-main': '#1E3252',
        'text-muted': '#6B7280',
      },
      fontFamily: {
        mono: ['"Martian Mono"', 'monospace'],
        sans: ['Roboto', 'sans-serif'],
      },
      maxWidth: {
        mobile: '430px',
      },
    },
  },
  plugins: [],
}
