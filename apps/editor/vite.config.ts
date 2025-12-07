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

// Check if building as library (embed mode)
// Note: process.env is available in Node.js context (vite.config.ts runs in Node)
const isLibraryBuild = process.env.BUILD_MODE === 'embed'
console.log(`[vite.config] BUILD_MODE=${process.env.BUILD_MODE}, isLibraryBuild=${isLibraryBuild}`)

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
  build: isLibraryBuild
    ? {
        // Library build for embedding in external pages (PHP, etc.)
        outDir: 'dist-embed',
        sourcemap: true,
        lib: {
          entry: path.resolve(__dirname, 'src/embed.tsx'),
          name: 'StorigeEditor',
          fileName: 'editor-bundle',
          formats: ['iife'],
        },
        rollupOptions: {
          output: {
            // Include all dependencies in the bundle
            inlineDynamicImports: true,
          },
        },
        // Don't minify for easier debugging during development
        minify: process.env.NODE_ENV === 'production' ? 'esbuild' : false,
      }
    : {
        // Standard SPA build
        outDir: 'dist',
        sourcemap: true,
      },
  optimizeDeps: {
    exclude: ['@pf/color-runtime'],
  },
})
