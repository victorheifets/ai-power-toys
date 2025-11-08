import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5275,
    proxy: {
      '/api': {
        target: 'http://localhost:3200',
        changeOrigin: true
      }
    }
  }
})
