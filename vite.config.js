import { defineConfig } from 'vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';

export default defineConfig({
  root: '.',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: './index.html',
        login: './login.html',
      },
    },
  },
  plugins: [
    viteStaticCopy({
      targets: [
        { src: 'map', dest: '.' },
        { src: 'locations.json', dest: '.' },
        { src: 'location-titles.json', dest: '.' },
        { src: 'pois.json', dest: '.' },
      ],
    }),
  ],
  server: {
    port: 8075,
  },
});
