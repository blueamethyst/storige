import { defineConfig, Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// @pf/color-runtime optional dependency를 스텁으로 대체하는 플러그인
function colorRuntimeStubPlugin(): Plugin {
  const virtualModuleId = '@pf/color-runtime'
  const resolvedVirtualModuleId = '\0' + virtualModuleId
  const stubCode = `
    export const cmykToRgb = async () => { throw new Error('not available') }
    export const rgbToCmyk = async () => { throw new Error('not available') }
    export const transformImageDataToProfile = async () => { throw new Error('not available') }
    export default { cmykToRgb, rgbToCmyk, transformImageDataToProfile }
  `
  return {
    name: 'color-runtime-stub',
    enforce: 'pre',
    resolveId(id, importer, options) {
      if (id === virtualModuleId) {
        return { id: resolvedVirtualModuleId, moduleSideEffects: false }
      }
    },
    load(id) {
      if (id === resolvedVirtualModuleId) {
        return stubCode
      }
    },
  }
}

export default defineConfig({
  plugins: [colorRuntimeStubPlugin(), react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
  optimizeDeps: {
    exclude: ['@pf/color-runtime'],
  },
})
