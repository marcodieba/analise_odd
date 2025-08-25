import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import UnoCSS from 'unocss/vite' // Importa o UnoCSS

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    UnoCSS(), // Adiciona o plugin do UnoCSS
  ],
})