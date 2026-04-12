import { defineConfig } from 'vite';

export default defineConfig({
  // Usa rutas relativas para que el build funcione tanto en dominio raiz como en subcarpetas.
  base: './',
  server: {
    port: 3000,
    open: true
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true
  }
});
