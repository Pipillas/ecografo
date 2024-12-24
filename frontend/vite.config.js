import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Permite acceso desde la red local
  },
  build: {
    outDir: 'C:/Users/pipas/Escritorio/ecografo/backend/dist',
    emptyOutDir: true, // Vacía la carpeta de salida aunque esté fuera del proyecto
  },
})