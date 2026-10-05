/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // surfaces (light)
        ink: {
          DEFAULT: '#F6F5F1',
          soft: '#FFFFFF',
          panel: '#FFFFFF',
          raised: '#FFFFFF',
        },
        line: {
          DEFAULT: 'rgba(23,52,53,0.10)',
          strong: 'rgba(23,52,53,0.20)',
        },
        // brand greens
        brand: {
          DEFAULT: '#24574E',
          deep: '#173435',
          ink: '#173435',
          glow: '#2f7d6b',
        },
        lime: {
          DEFAULT: '#DEF76E',
          soft: '#EAFD9F',
        },
        mint: '#5FBA95',
        magenta: {
          DEFAULT: '#E01072',
          hover: '#C40D63',
        },
        sev: {
          critical: '#D6336C',
          high: '#E07A2F',
          medium: '#C9A227',
          low: '#3F7FD6',
          opportunity: '#2F9E74',
          good: '#2F9E74',
        },
        txt: {
          primary: '#173435',
          muted: '#3F5A52',
          faint: '#6B817A',
        },
      },
      fontFamily: {
        display: ['Poppins', 'system-ui', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
        accent: ['"Montserrat Alternates"', 'Poppins', 'sans-serif'],
        mono: ['"Fragment Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      letterSpacing: {
        eyebrow: '0.24em',
        display: '-0.02em',
      },
      borderRadius: {
        xl2: '1.25rem',
        xl3: '1.75rem',
      },
      boxShadow: {
        panel: '0 20px 45px -24px rgba(23,52,53,0.28), 0 2px 8px rgba(23,52,53,0.06)',
        card: '0 12px 30px -18px rgba(23,52,53,0.30)',
        glow: '0 20px 50px -22px rgba(36,87,78,0.45)',
        lime: '0 18px 40px -18px rgba(222,247,110,0.7)',
        magenta: '0 18px 40px -16px rgba(224,16,114,0.5)',
      },
      backgroundImage: {
        hairline:
          'linear-gradient(120deg, rgba(23,52,53,0.10), rgba(23,52,53,0.02) 40%, rgba(23,52,53,0.08))',
      },
      keyframes: {
        aurora: {
          '0%,100%': { transform: 'translate3d(-4%, -2%, 0) scale(1.05)' },
          '50%': { transform: 'translate3d(4%, 3%, 0) scale(1.15)' },
        },
        floaty: {
          '0%,100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        scan: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(400%)' },
        },
        pulseRing: {
          '0%': { transform: 'scale(0.9)', opacity: '0.7' },
          '100%': { transform: 'scale(1.6)', opacity: '0' },
        },
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        radar: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        gradientMove: {
          '0%,100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        halo: {
          '0%,100%': { opacity: '0.35', transform: 'scale(1)' },
          '50%': { opacity: '0.7', transform: 'scale(1.08)' },
        },
      },
      animation: {
        aurora: 'aurora 20s ease-in-out infinite',
        floaty: 'floaty 6s ease-in-out infinite',
        shimmer: 'shimmer 2.4s linear infinite',
        scan: 'scan 2.2s ease-in-out infinite',
        pulseRing: 'pulseRing 2.4s ease-out infinite',
        marquee: 'marquee 28s linear infinite',
        radar: 'radar 3.2s linear infinite',
        gradientMove: 'gradientMove 6s ease-in-out infinite',
        halo: 'halo 5s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
