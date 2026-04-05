import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Vite = servidor de desenvolvimento + empacotador do React.
export default defineConfig({
  plugins: [react()],
  server: {
    // Pedidos do browser a /api/... são reencaminhados para o Express na 3000,
    // removendo o prefixo /api (o backend expõe /computadores, não /api/computadores).
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
})
