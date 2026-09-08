import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

function resolveSupabaseUrl(): string {
  const viteUrl = process.env.VITE_SUPABASE_URL;
  if (viteUrl && (viteUrl.startsWith('https://') || viteUrl.startsWith('http://'))) {
    return viteUrl;
  }
  const serverUrl = process.env.SUPABASE_URL;
  if (serverUrl && (serverUrl.startsWith('https://') || serverUrl.startsWith('http://'))) {
    return serverUrl;
  }
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (anonKey && anonKey.includes('.')) {
    try {
      const parts = anonKey.split('.');
      if (parts[1]) {
        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
        if (payload.ref) {
          return `https://${payload.ref}.supabase.co`;
        }
      }
    } catch {}
  }
  return 'https://ymweduynoxuacchspgfj.supabase.co';
}

export default defineConfig(() => {
  const resolvedSupabaseUrl = resolveSupabaseUrl();
  return {
    define: {
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(resolvedSupabaseUrl),
    },
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
    },
    server: {
      allowedHosts: ['senperspective.com', '.senperspective.com', 'localhost', '127.0.0.1'],
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
