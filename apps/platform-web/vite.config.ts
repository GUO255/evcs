import { fileURLToPath, URL } from 'node:url'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

function parsePort(value: string | undefined, fallback: number): number {
  if (value === undefined) return fallback
  if (!/^\d+$/.test(value)) throw new Error('PORT must be an integer from 1 to 65535')
  const port = Number(value)
  if (port < 1 || port > 65535) throw new Error('PORT must be an integer from 1 to 65535')
  return port
}

const port = parsePort(process.env.PORT, 3250)

export default defineConfig({
  cacheDir: process.env.VITE_CACHE_DIR,
  plugins: [
    tanstackRouter({
      target: 'react',
      autoCodeSplitting: true,
    }),
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
    dedupe: ['react', 'react-dom'],
  },
  envPrefix: 'PUBLIC_',
  server: {
    host: '127.0.0.1',
    port,
    strictPort: true,
    proxy: {
      '/api': proxyToPlatformBff(),
      '/gateway': proxyToPlatformBff(),
      '/local-objects': proxyToPlatformBff(),
    },
  },
  preview: {
    host: '127.0.0.1',
    port,
    strictPort: true,
  },
})

function proxyToPlatformBff() {
  return {
    target: 'http://127.0.0.1:3240',
    changeOrigin: false,
    ws: false,
  }
}
