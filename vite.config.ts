import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'DPO_DEV_')
  const target = env.DPO_DEV_API_TARGET || 'http://127.0.0.1:8796'
  const local = new URL(target)
  if (!['127.0.0.1', 'localhost', '[::1]'].includes(local.hostname)) throw new Error('DPO dev proxy requires a loopback backend.')
  return {
    plugins: [react(), tailwindcss()],
    server: {
      proxy: {
        '/__dpo-api/': {
          target,
          changeOrigin: true,
          rewrite: path => path.replace(/^\/__dpo-api/, '/api'),
          proxyTimeout: 330000,
          configure(proxy) {
            proxy.on('proxyReq', request => {
              request.removeHeader('cookie')
              request.removeHeader('authorization')
              if (env.DPO_DEV_USERNAME && env.DPO_DEV_PASSWORD) {
                request.setHeader('authorization', `Basic ${Buffer.from(`${env.DPO_DEV_USERNAME}:${env.DPO_DEV_PASSWORD}`).toString('base64')}`)
              }
            })
            proxy.on('proxyRes', response => { delete response.headers['set-cookie'] })
          },
        },
        '^/__polytech-events$': {
          target: 'https://mospolytech.ru',
          changeOrigin: true,
          rewrite: () => '/events/',
          proxyTimeout: 20000,
          configure(proxy) {
            proxy.on('proxyReq', request => {
              request.removeHeader('cookie')
              request.removeHeader('authorization')
            })
            proxy.on('proxyRes', response => { delete response.headers['set-cookie'] })
          },
        },
      },
    },
  }
})
