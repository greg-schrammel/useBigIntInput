import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'

export default defineConfig({
  build: {
    lib: {
      entry: './useBigIntInput.ts',
      fileName: 'useBigIntInput',
      formats: ['es'],
    },
    target: 'esnext',
    minify: false,
    rollupOptions: {
      external: ['react', 'react-dom'],
      treeshake: true,
    },
  },
  plugins: [dts()],
})
