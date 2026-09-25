/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

const isGitHubActions = !!process.env.GITHUB_ACTIONS
const basePath = isGitHubActions ? '/LISTIA/' : '/'

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.png'],
      manifest: {
        name: 'LISTIA',
        short_name: 'LISTIA',
        description: 'Libreta de compra manuscrita conectada al catálogo de Mercadona',
        start_url: basePath,
        scope: basePath,
        display: 'standalone',
        background_color: '#f7f4ef',
        theme_color: '#3d6b4f',
        icons: [
          { src: `${basePath}icons/icon-192.png`, sizes: '192x192', type: 'image/png' },
          { src: `${basePath}icons/icon-512.png`, sizes: '512x512', type: 'image/png' },
        ],
      },
      devOptions: {
        enabled: true,
      },
      workbox: {
        navigateFallback: `${basePath}index.html`,
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
