/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.png'],
      manifest: {
        name: 'Lista Casa',
        short_name: 'Lista',
        start_url: '/',
        display: 'standalone',
        background_color: '#f7f4ef',
        theme_color: '#3d6b4f',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        navigateFallback: '/index.html',
        runtimeCaching: [],
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    globals: true,
    passWithNoTests: true,
  },
})
