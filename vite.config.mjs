import {defineConfig} from 'vite';
import {resolve} from 'node:path';

export default defineConfig({
  build: {
    outDir: 'docs',
    rollupOptions: {input: {
      home: resolve(import.meta.dirname, 'index.html'),
      about: resolve(import.meta.dirname, 'about.html'),
      privacy: resolve(import.meta.dirname, 'privacy.html'),
      terms: resolve(import.meta.dirname, 'terms.html')
    }}
  }
});
