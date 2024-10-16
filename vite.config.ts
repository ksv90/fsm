import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig({
  build: {
    minify: 'esbuild',
    sourcemap: true,
    lib: {
      entry: './src/main.ts',
      name: 'fsm',
      formats: ['es'],
      fileName: 'main',
    },
    rollupOptions: {
      external: ['@ksv90/decorators'],
    },
  },
  esbuild: {
    target: 'es2022',
    keepNames: true,
  },
  plugins: [dts({ entryRoot: 'src', rollupTypes: true })],
});
