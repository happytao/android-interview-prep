import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'
import { questionBankPlugin } from './plugins/questionBankPlugin'

export default defineConfig({
  base: process.env.VITE_BASE_PATH || '/',
  plugins: [vue(), tailwindcss(), questionBankPlugin()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-vue': ['vue', 'vue-router', 'pinia'],
          'vendor-search': ['minisearch'],
        },
      },
    },
  },
})
