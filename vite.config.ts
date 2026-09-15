import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import browserslist from 'browserslist';
import { browserslistToTargets } from 'lightningcss';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    css: {
      // FIX (white screen on phones, part 2): Tailwind v4 emits modern CSS —
      // oklch() colors, color-mix(), @property — that older mobile browsers
      // (Chrome <111 / Safari <15.4) treat as INVALID and silently drop.
      // Result: backgrounds/text render white-on-white → a "blank" page where
      // only images survive (the "weird logo" report). Lightning CSS with
      // explicit browser targets downlevels oklch()/color-mix() to rgb()
      // fallbacks so every browser gets valid colors.
      transformer: 'lightningcss' as const,
      lightningcss: {
        targets: browserslistToTargets(browserslist('chrome >= 75, safari >= 13, firefox >= 75, edge >= 79')),
      },
    },
    define: {
      // Changes every build — used by App.tsx to force exactly one reload on
      // devices still running a stale cached bundle after a new deploy.
      __BUILD_ID__: JSON.stringify(String(Date.now())),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      chunkSizeWarningLimit: 1600,
      // FIX (white screen on phones): Vite 6's default target
      // 'baseline-widely-available' only supports Chrome 107+/Safari 16+. Older
      // phone browsers fail to PARSE the bundle (SyntaxError on `?.`/`??`/class
      // fields) before React mounts — a pure white screen with no ErrorBoundary.
      // safari13/chrome75 forces esbuild to transpile ALL ES2020 syntax
      // (optional chaining, nullish coalescing) down to ~2019 browsers.
      target: ['chrome75', 'edge79', 'firefox75', 'safari13'],
      rollupOptions: {
        output: {
          manualChunks: {
            react: ['react', 'react-dom', 'react-router-dom'],
            firebase: ['firebase/app', 'firebase/auth', 'firebase/database', 'firebase/storage'],
            icons: ['lucide-react'],
            // Split heavy third-party libs so the main app chunk stays lean and
            // only loads what a page actually needs.
            markdown: ['react-markdown', 'remark-gfm'],
            crop: ['react-easy-crop', 'react-image-crop'],
            motion: ['motion'],
            opentype: ['opentype.js'],
            'ai-engine': ['@google/genai'],
          },
        },
      },
    },
    server: {
      host: '0.0.0.0',
      port: 3000,
      allowedHosts: ['senperspective.com', '.senperspective.com', 'localhost', '127.0.0.1'],
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
