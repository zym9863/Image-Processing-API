import { cloudflare } from '@cloudflare/vite-plugin'
import { defineConfig } from 'vite'
import ssrPlugin from 'vite-ssr-components/plugin'

export default defineConfig({
  plugins: [cloudflare(), ssrPlugin()],
  ssr: {
    external: ['sharp']
  },
  optimizeDeps: {
    exclude: ['sharp']
  },
  define: {
    global: 'globalThis'
  },
  build: {
    rollupOptions: {
      input: {
        ssr: 'src/index.tsx' // 修正为相对路径，避免 URL 编码问题
      }
    }
  }
})
