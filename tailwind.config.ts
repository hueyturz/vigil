import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        vl: {
          navy:     '#0A2540',
          gold:     '#E8B923',
          amber:    '#F4C95D',
          charcoal: '#2C3E50',
          cream:    '#F8F5F0',
          teal:     '#4A7C8C',
        },
      },
      fontFamily: {
        serif: ['Georgia', 'serif'],
      },
    },
  },
  plugins: [],
}

export default config
