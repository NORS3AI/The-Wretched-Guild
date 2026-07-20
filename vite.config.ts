import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

// A RELATIVE base ('./') makes the built assets load no matter what path the
// site is served from — project page (/The-Wretched-Guild/), a custom domain,
// or a differently-cased URL. This avoids the classic GitHub Pages 404 where an
// absolute base path doesn't match the actual repo URL. Output goes to /docs.
export default defineConfig({
  plugins: [svelte()],
  base: './',
  build: {
    outDir: 'docs',
    emptyOutDir: true,
  },
});
