import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
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
