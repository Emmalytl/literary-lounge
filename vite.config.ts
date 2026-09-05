import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') }
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'favicon.png', 'icon-192.png', 'icon-512.png'],
      manifest: {
        name: 'The Literary Lounge',
        short_name: 'Lounge',
        description: 'Read. Discuss. Connect.',
        theme_color: '#1B2A4A',
        background_color: '#F6F1E7',
        display: 'standalone',
        id: '/',
        scope: '/',
        start_url: '/',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
        ]
      },
      workbox: {
        // Only the app shell is precached. Lazy route chunks are fetched when
        // needed, which keeps first launch fast on an installed device.
        // Protected book files are NEVER
        // cached by the service worker directly — offline reading for
        // authorised chapters is handled explicitly in src/services/offline.ts
        // via authenticated IndexedDB storage tied to the member's session,
        // so access can be revoked server-side.
        globPatterns: ['**/index-*.js', '**/index-*.css', '**/*.{html,svg,png,ico}'],
        clientsClaim: true,
        skipWaiting: true
      }
    })
  ],
  server: {
    port: 5173,
    watch: {
      // OneDrive can keep user-supplied photos locked while syncing.
      ignored: ['**/*.jpeg', '**/*.jpg']
    }
  }
})
