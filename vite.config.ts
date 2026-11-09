import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
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
})