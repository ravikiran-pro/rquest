import dotenv from 'dotenv';
dotenv.config();

import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import react from '@vitejs/plugin-react';
// import WorkboxPlugin from 'workbox-webpack-plugin';

const { PORT = 3001 } = process.env;

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Rquest',
        short_name: 'Rquest',
        description: 'Rquest - Connect Everywhere Everything',
        icons: [
          {
            src: '/images/app-icon.png',
            sizes: '501x501',
            type: 'image/png',
          },
        ],
      },
      workbox: {
        navigateFallbackAllowlist: [/^\/.*$/],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        importScripts: ['/sw-push.js'],
      },
      devOptions: {
        enabled: true,
        navigateFallbackAllowlist: [/^\/.*$/],
      },
    }),
    // WorkboxPlugin.GenerateSW({
    //   swDest: 'dist/app/sw.js',
    //   globDirectory: 'dist/app',
    //   globPatterns: ['**/*.{js,css,html,png,jpg,json}'],
    // }),
  ],
  server: {
    host: true,
    port: 3000,
    allowedHosts: true,
    proxy: {
      '/api': {
        target: `http://localhost:${PORT}`,
        changeOrigin: true,
      },
      '/uploads': {
        target: `http://localhost:${PORT}`,
        changeOrigin: true,
      },
      '/socket.io': {
        target: `http://localhost:${PORT}`,
        changeOrigin: true,
        ws: true,
      },
    },
  },
  build: {
    outDir: 'dist/app',
  },
});
