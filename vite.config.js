import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// Local dev only — mirrors api/scan.js so `npm run dev` doesn't require `vercel dev`.
// ANTHROPIC_API_KEY is read server-side here and never reaches the client bundle.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api/scan': {
          target: 'https://api.anthropic.com',
          changeOrigin: true,
          rewrite: path => path.replace(/^\/api\/scan/, '/v1/messages'),
          configure: proxy => {
            proxy.on('proxyReq', proxyReq => {
              proxyReq.setHeader('x-api-key', env.ANTHROPIC_API_KEY || '')
              proxyReq.setHeader('anthropic-version', '2023-06-01')
            })
          },
        },
      },
    },
  }
})
