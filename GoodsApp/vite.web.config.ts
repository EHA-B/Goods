import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

export default defineConfig({
  root: path.resolve(__dirname, 'src/renderer'),

  plugins: [
    react(),
    tailwindcss(),
  ],

  server: {
    port: 5173,
  },
})