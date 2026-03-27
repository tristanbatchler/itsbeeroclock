import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, path.resolve(__dirname, '..'), '');
  
  return {
    plugins: [
      react(),
      tailwindcss()
    ],
    server: {
      proxy: {
        '/api': {
          target: 'http://localhost:8080',
          changeOrigin: true,
        }
      }
    },
    define: {
      'import.meta.env.SUPABASE_URL': JSON.stringify(env.SUPABASE_URL),
      'import.meta.env.SUPABASE_PUBLISHABLE_KEY': JSON.stringify(env.SUPABASE_PUBLISHABLE_KEY),
      'import.meta.env.SUPABASE_SECRET_KEY': JSON.stringify(env.SUPABASE_SECRET_KEY),
      'import.meta.env.APP_DOMAIN_NAME': JSON.stringify(env.APP_DOMAIN_NAME),
      'import.meta.env.APP_SUPPORT_EMAIL': JSON.stringify(env.APP_SUPPORT_EMAIL),
      'import.meta.env.TABLE_NAME': JSON.stringify(env.TABLE_NAME),
    }
  };
});