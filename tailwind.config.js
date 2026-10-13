/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: { extend: {
    fontFamily: { sans: ['Inter','system-ui','sans-serif'], head: ['"Plus Jakarta Sans"','Inter','sans-serif'] },
    colors: { ink: { 950:'#0A1022',900:'#111A33',800:'#1E293B',700:'#334155',600:'#475569',500:'#64748B',400:'#94A3B8',300:'#CBD5E1',200:'#E2E8F0',100:'#F1F5F9',50:'#F8FAFC' }, canvas:'#F5F6FB' },
    boxShadow: { card:'0 1px 2px rgba(16,24,40,.05), 0 1px 3px rgba(16,24,40,.06)', pop:'0 18px 40px -12px rgba(16,24,40,.22), 0 6px 14px -6px rgba(16,24,40,.10)' },
  } },
  plugins: [],
}
