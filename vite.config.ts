import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'https://backend-deursocial-rn-nine.vercel.app',
        changeOrigin: true,
        secure: true,
      },
      '/supabase-api': {
        target: 'https://jbcdjttfaxwendlfpgjk.supabase.co',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/supabase-api/, ''),
        headers: {
          'apikey': process.env.VITE_SUPABASE_ANON_KEY ?? '',
          'Authorization': `Bearer ${process.env.VITE_SUPABASE_ANON_KEY ?? ''}`,
          'User-Agent': 'Node/Vite-Proxy'
        }
      }
    },
  },
})
