import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Dev convenience: forward /api/* to the local backend so the panel works
    // without setting VITE_API_URL. In production VITE_API_URL is always set.
    proxy: {
      '/api': { target: 'http://localhost:5000', changeOrigin: true }
    }
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts'
  }
});
