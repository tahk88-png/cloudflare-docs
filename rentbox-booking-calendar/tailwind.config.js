/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Rentbox Brand Colors
        rentbox: {
          accent: '#1DB954',
          'accent-hover': '#159A46',
          background: '#F7F9F8',
          surface: '#FFFFFF',
          border: '#E2E8E4',
          'text-primary': '#0F172A',
          'text-muted': '#6B7280',
          disabled: '#CBD5CF',
          error: '#DC2626',
          'partial-booking': '#EAF7F0',
          'unavailable': '#F1F3F2',
        },
      },
      borderRadius: {
        'rentbox-sm': '10px',
        'rentbox': '14px',
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          '"Helvetica Neue"',
          'Arial',
          'sans-serif',
        ],
      },
      boxShadow: {
        'rentbox-sm': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'rentbox': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        'rentbox-lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
      },
    },
  },
  plugins: [],
};
