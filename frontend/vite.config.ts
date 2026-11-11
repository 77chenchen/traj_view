import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  cacheDir: '.vite',
  build: {
    modulePreload: false,
    cssCodeSplit: false,
    rollupOptions: {
      output: { inlineDynamicImports: true },
    },
  },
});
