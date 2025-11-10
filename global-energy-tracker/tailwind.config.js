/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Energy source colors
        oil: '#FF6B35',
        gas: '#4ECDC4',
        coal: '#2C3E50',
        nuclear: '#9B59B6',
        hydro: '#3498DB',
        wind: '#16A085',
        solar: '#F39C12',
        biomass: '#27AE60',
        geothermal: '#E74C3C',
        otherRenewables: '#2ECC71',
      },
      fontSize: {
        'hero': ['6rem', { lineHeight: '1.1', fontWeight: '700' }],
        'display': ['4rem', { lineHeight: '1.1', fontWeight: '600' }],
        'large': ['3rem', { lineHeight: '1.2', fontWeight: '600' }],
      },
    },
  },
  plugins: [],
}
