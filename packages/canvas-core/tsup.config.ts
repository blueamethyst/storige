import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  outExtension() {
    return { js: '.js', dts: '.d.ts' };
  },
  dts: true,
  sourcemap: true,
  clean: true,
  external: [
    'fabric',
    'fabric-history',
    '@imgly/background-removal',
    '@techstark/opencv-js',
  ],
  esbuildOptions(options) {
    options.jsx = 'preserve';
  },
});
