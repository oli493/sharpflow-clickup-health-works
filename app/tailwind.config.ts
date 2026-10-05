import type { Config } from 'tailwindcss'

// Brand tokens carried over from the prototype (Sharpflow).
export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          ink: '#173435',
          green: '#24574E',
          mint: '#5FBA95',
        },
        lime: '#DEF76E',
        magenta: { DEFAULT: '#E01072', hover: '#C40D63' },
        surface: '#F6F5F1',
        txt: { primary: '#173435', muted: '#3F5A52', faint: '#6B817A' },
      },
      fontFamily: {
        display: ['Poppins', 'system-ui', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
        accent: ['"Montserrat Alternates"', 'Poppins', 'sans-serif'],
      },
      borderRadius: { xl2: '1.25rem' },
    },
  },
  plugins: [],
} satisfies Config
