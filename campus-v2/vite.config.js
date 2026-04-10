import { defineConfig } from 'vite';

export default defineConfig({
  // Establece la base para que los assets carguen correctamente cuando se despliega en Hostinger bajo /campus/
  base: '/campus/',
  server: {
    port: 3000,
    open: true
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true
  }
});
