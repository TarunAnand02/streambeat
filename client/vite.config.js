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
        // Precache only the built app shell (JS/CSS/HTML) — video streams
        // and API responses are large/dynamic and must always hit the
        // network, never be served stale from a cache.
        globPatterns: ['**/*.{js,css,html,svg}'],
        navigateFallbackDenylist: [/^\/api\//],
        // Images only (thumbnails/avatars) — genuinely public, non-user-
        // specific content (already gated by unguessable ids, same as the
        // rest of the media endpoints), so caching them by URL is safe.
        // Deliberately NOT caching generic /api/* JSON here: this app
        // supports switching between multiple logged-in accounts on the
        // same device, and a URL-keyed cache would risk showing one
        // account's cached data (history, notifications, etc.) to another
        // account after switching while offline.
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.destination === 'image',
            handler: 'CacheFirst',
            options: {
              cacheName: 'streambeat-images',
              expiration: { maxEntries: 300, maxAgeSeconds: 7 * 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
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
