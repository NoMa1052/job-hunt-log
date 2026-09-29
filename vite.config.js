import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import brand from './src/config/brand.js'
import { color } from './src/ui/tokens.js'
import { previewSupabase } from './src/config/previewSupabase.js'

const manifest = JSON.stringify({
  name: brand.name,
  short_name: brand.name,
  description: brand.description,
  start_url: '/app',
  display: 'standalone',
  background_color: color.canvas,
  theme_color: color.canvas,
  icons: [
    { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
    { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ],
}, null, 2)

// Fills the product name into index.html and serves/emits the web manifest,
// so src/config/brand.js stays the only place the name is written.
function brandPlugin() {
  return {
    name: 'brand',
    transformIndexHtml: html => html
      .replaceAll('%BRAND_NAME%', brand.name)
      .replaceAll('%BRAND_DESCRIPTION%', brand.description),
    configureServer(server) {
      server.middlewares.use('/manifest.webmanifest', (_req, res) => {
        res.setHeader('Content-Type', 'application/manifest+json')
        res.end(manifest)
      })
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'manifest.webmanifest', source: manifest })
    },
  }
}

// Previews are pinned to the dev database; production and local builds use their env vars.
const previewDefines = process.env.VERCEL_ENV === 'preview'
  ? {
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(previewSupabase.url),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(previewSupabase.anonKey),
    }
  : {}

export default defineConfig({
  plugins: [react(), brandPlugin()],
  define: previewDefines,
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{js,jsx}'],
  },
})
