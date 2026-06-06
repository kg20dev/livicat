/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import type { ProxyOptions } from 'vite'

/**
 * Proxy YouTube live chat through Vite dev server to bypass X-Frame-Options.
 * The iframe loads from localhost → same origin → CSS injection works.
 */
const youtubeProxy: ProxyOptions = {
  target: 'https://www.youtube.com',
  changeOrigin: true,
  secure: true,
  rewrite: (path) => path.replace(/^\/youtube-proxy/, ''),
  configure: (proxy) => {
    proxy.on('proxyRes', (proxyRes) => {
      // Strip headers that block iframe embedding
      delete proxyRes.headers['x-frame-options']
      delete proxyRes.headers['content-security-policy']
      delete proxyRes.headers['x-content-type-options']
    })
  },
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // Use relative paths for file:// loading in Electron
  server: {
    port: 3000,
    host: true,
    proxy: {
      '/youtube-proxy': youtubeProxy,
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: true,
  },
})
