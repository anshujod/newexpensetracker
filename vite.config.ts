import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import themePlugin from "@replit/vite-plugin-shadcn-theme-json";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

export default defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    themePlugin(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './client/src'),
      '@shared': path.resolve(__dirname, './shared'),
      '@assets': path.resolve(__dirname, "attached_assets"),
    },
  },
  server: {
    port: 3000,
    strictPort: true,
    hmr: {
      protocol: 'ws', // Changed from wss to ws
      host: process.env.VITE_HMR_HOST || 'localhost',
      // port: 443
    },
    allowedHosts: process.env.VITE_ALLOWED_HOSTS?.split(',') || true,
    proxy: {
      '/api': {
        target: 'http://localhost:5001', // Updated port to 5001
        changeOrigin: true,
        secure: false
      }
    }
  },
  preview: {
    port: 3000,
    strictPort: true
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  root: path.resolve(__dirname, "client"),
})
