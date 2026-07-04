import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'StreamBeat',
        short_name: 'StreamBeat',
        description: 'Upload, organize and stream videos without distractions.',
        theme_color: '#121212',
        background_color: '#121212',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Precache only the built app shell (JS/CSS/HTML) — video streams,
        // thumbnails, and API responses are large/dynamic and must always
        // hit the network, never be served stale from a cache.
        globPatterns: ['**/*.{js,css,html,svg}'],
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [],
      },
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        // Vendor libraries change far less often than app code — splitting
        // them into their own chunk means a browser that already visited
        // the site can reuse this cached chunk across deploys, only
        // re-downloading the (much smaller) app-code chunk that changed.
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (
              /[\\/]node_modules[\\/](react|react-dom|react-router-dom|@reduxjs|react-redux|axios)[\\/]/.test(id)
            ) {
              return 'vendor';
            }
          }
        },
      },
    },
  },
})
