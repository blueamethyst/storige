import { defineConfig, Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { visualizer } from 'rollup-plugin-visualizer'
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
  plugins: [
    colorRuntimeStubPlugin(),
    react(),
    visualizer({
      filename: 'dist/stats.html',
      open: true,
      gzipSize: true,
      brotliSize: true,
    }),
  ],
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
        rollupOptions: {
          output: {
            manualChunks: (id) => {
              // Vendor chunks - large libraries separated for better caching
              if (id.includes('node_modules')) {
                // React ecosystem
                if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
                  return 'vendor-react'
                }
                // Fabric.js - canvas library (large)
                if (id.includes('fabric')) {
                  return 'vendor-fabric'
                }
                // OpenCV.js - image processing (very large)
                if (id.includes('opencv') || id.includes('@techstark/opencv-js')) {
                  return 'vendor-opencv'
                }
                // ONNX Runtime - ML inference for background removal
                if (id.includes('onnxruntime')) {
                  return 'vendor-onnx'
                }
                // Background removal
                if (id.includes('@imgly/background-removal')) {
                  return 'vendor-bg-removal'
                }
                // PDF libraries
                if (id.includes('pdf-lib') || id.includes('jspdf')) {
                  return 'vendor-pdf'
                }
                // QR/Barcode
                if (id.includes('qrcode') || id.includes('jsbarcode') || id.includes('bwip-js')) {
                  return 'vendor-codes'
                }
                // UI components (radix, etc)
                if (id.includes('@radix-ui') || id.includes('lucide-react')) {
                  return 'vendor-ui'
                }
                // Other vendor libs
                return 'vendor'
              }
              // Canvas-core package
              if (id.includes('packages/canvas-core')) {
                return 'canvas-core'
              }
            },
          },
        },
      },
  optimizeDeps: {
    exclude: ['@pf/color-runtime'],
  },
})
