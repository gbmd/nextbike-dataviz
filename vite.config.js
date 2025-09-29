import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    host: true,              // == '0.0.0.0'
    port: 5173,
    strictPort: true,
    allowedHosts: ['bikesharingpaper.duckdns.org'],
    // If you access through HTTPS reverse proxy, uncomment:
    // hmr: { host: 'datsimiaa.ftm.ed.tum.de' }
    watch: {
      ignored: [
        '**/node_modules/**',
        '**/.git/**',      ],
    },
  fs: { strict: true }, 
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
    allowedHosts: ['bikesharingpaper.duckdns.org']
  },
})
