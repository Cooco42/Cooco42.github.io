import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'node:path'
import { coachApiPlugin } from './vite.coachPlugin.ts'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  Object.assign(process.env, env)

  return {
    plugins: [
      react(),
      coachApiPlugin(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.svg', 'apple-touch-v6.png', 'icon-192-v6.png', 'icon-512-v6.png'],
        devOptions: {
          enabled: true,
          type: 'module',
        },
        manifest: {
          id: '/',
          name: 'Nonogram',
          short_name: 'Nonogram',
          description: 'Clean nonogram puzzles. Play offline.',
          background_color: '#fdd044',
          theme_color: '#fdd044',
          display: 'standalone',
          display_override: ['standalone', 'fullscreen', 'minimal-ui'],
          orientation: 'any',
          scope: '/',
          start_url: '/',
          lang: 'en',
          icons: [
            {
              src: 'icon-192-v6.png',
              sizes: '192x192',
              type: 'image/png',
            },
            {
              src: 'icon-512-v6.png',
              sizes: '512x512',
              type: 'image/png',
            },
            {
              src: 'icon-512-v6.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,json,webmanifest}'],
          globIgnores: [
            '**/icon-*-v2.png',
            '**/icon-*-v3.png',
            '**/icon-*-v4.png',
            '**/icon-*-v5.png',
            '**/apple-touch-v5.png',
            '**/apple-touch-v2.png',
            '**/apple-touch-v3.png',
            '**/apple-touch-v4.png',
            '**/apple-touch-icon.png',
            '**/pwa-192.png',
            '**/pwa-512.png',
          ],
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
          cleanupOutdatedCaches: true,
          navigateFallback: '/index.html',
          navigateFallbackDenylist: [/^\/api\//],
          runtimeCaching: [
            {
              urlPattern: /^\/api\/coach/i,
              handler: 'NetworkOnly',
            },
            {
              urlPattern: /\/data\/nonogram\.json$/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'nonogram-dataset',
                expiration: {
                  maxEntries: 2,
                  maxAgeSeconds: 60 * 60 * 24 * 30,
                },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'gstatic-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
              },
            },
          ],
        },
      }),
    ],
    server: {
      host: true,
      port: 5173,
    },
    optimizeDeps: {
      include: [
        'commander',
        'nonogram-solver/src/Puzzle.js',
        'nonogram-solver/src/Strategy.js',
        'nonogram-solver/src/allSolvers.js',
        'nonogram-solver/src/solvers/pushSolver.js',
        'nonogram-solver/src/solvers/bruteForceSolver.js',
      ],
    },
    build: {
      commonjsOptions: {
        transformMixedEsModules: true,
        include: [/nonogram-solver/, /node_modules/],
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
  }
})
