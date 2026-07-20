import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

// GitHub Pages serves this project site from https://<user>.github.io/The-Wretched-Guild/
// so the base path must match the repo name. Build output goes to /docs on `main`.
export default defineConfig({
  plugins: [svelte()],
  base: '/The-Wretched-Guild/',
  build: {
    outDir: 'docs',
    emptyOutDir: true,
  },
});
