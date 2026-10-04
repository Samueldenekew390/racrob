import { resolve } from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  return {
    build: {
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'index.html'),
          products: resolve(__dirname, 'products.html'),
          product: resolve(__dirname, 'product.html'),
          applications: resolve(__dirname, 'applications.html'),
          booking: resolve(__dirname, 'booking.html'),
          login: resolve(__dirname, 'login.html'),
          admin: resolve(__dirname, 'admin.html'),
        },
      },
    },
    resolve: {
      alias: {
        '@': resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
