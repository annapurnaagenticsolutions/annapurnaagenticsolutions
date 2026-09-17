/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Pattern Forest palette
        'forest-moss': '#2d5016',
        'forest-leaf': '#6ba547',
        'forest-light': '#a8d5ba',
        'forest-sky': '#e8f4f8',
        // Maze Mountain palette
        'maze-stone': '#5a5a5a',
        'maze-path': '#d4a574',
        'maze-wall': '#3d3d3d',
        // Balance Bay palette
        'balance-sky': '#87ceeb',
        'balance-water': '#4a90e2',
        'balance-sand': '#f4d03f',
        'balance-wood': '#8b6f47',
        // Gear Factory palette
        'gear-brass': '#d4af37',
        'gear-iron': '#6b7280',
        'gear-copper': '#b87333',
        'gear-silver': '#c0c0c0',
        // Shape Workshop palette
        'shape-primary': '#ff6b6b',
        'shape-secondary': '#ffd93d',
        'shape-tertiary': '#6bcf7f',
        'shape-quaternary': '#4d96ff',
      },
      fontFamily: {
        display: ['Fredoka', 'system-ui', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
