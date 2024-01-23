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
      manifest: {
        name: 'Rquest',
        short_name: 'Rquest',
        description: 'Rquest - Connect Everywhere Everything',
        icons: [
          {
            src: '/images/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
      devOptions: {
        enabled: true,
      },
    }),
    // WorkboxPlugin.GenerateSW({
    //   swDest: 'dist/app/sw.js',
    //   globDirectory: 'dist/app',
    //   globPatterns: ['**/*.{js,css,html,png,jpg,json}'],
    // }),
  ],
  server: {
    proxy: {
      '/api': {
        target: 'https://rquest.onrender.com',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist/app',
  },
});
