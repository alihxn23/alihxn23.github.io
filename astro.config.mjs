import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  output: 'static',
  build: {
    assets: '_astro',
  },
  vite: {
    build: {
      cssMinify: true,
      minify: true,
    },
  },
});
