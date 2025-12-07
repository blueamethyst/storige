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

// @imgly/background-removal을 스텁으로 대체하는 플러그인 (WASM 모델 포함하여 큰 사이즈)
function backgroundRemovalStubPlugin(): Plugin {
  const virtualModuleId = '@imgly/background-removal'
  const resolvedVirtualModuleId = '\0' + virtualModuleId
  const stubCode = `
    // Background removal stub - feature disabled
    export async function removeBackground() {
      throw new Error('Background removal is not available in this build')
    }
    export async function preload() {
      // No-op stub
    }
    export default { removeBackground, preload }
  `
  return {
    name: 'background-removal-stub',
    enforce: 'pre',
    resolveId(id) {
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

// OpenCV.js를 스텁으로 대체하는 플러그인 (번들 사이즈 ~45MB 감소)
function opencvStubPlugin(): Plugin {
  const virtualModuleId = '@techstark/opencv-js'
  const resolvedVirtualModuleId = '\0' + virtualModuleId
  const stubCode = `
    // OpenCV.js stub - image processing features disabled
    const cv = {
      onRuntimeInitialized: () => {},
      Mat: class Mat {
        constructor() { this.rows = 0; this.cols = 0; }
        delete() {}
      },
      imread: () => new cv.Mat(),
      imshow: () => {},
      cvtColor: () => {},
      threshold: () => {},
      findContours: () => [],
      boundingRect: () => ({ x: 0, y: 0, width: 0, height: 0 }),
      distanceTransform: () => {},
      convexHull: () => {},
      split: () => [],
      merge: () => {},
      COLOR_RGBA2GRAY: 0,
      COLOR_GRAY2RGBA: 0,
      THRESH_BINARY: 0,
      RETR_EXTERNAL: 0,
      CHAIN_APPROX_SIMPLE: 0,
      DIST_L2: 0,
      MatVector: class MatVector { size() { return 0 } get() { return new cv.Mat() } delete() {} },
    }
    export default cv
  `
  return {
    name: 'opencv-stub',
    enforce: 'pre',
    resolveId(id) {
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

// Embed/Library build configuration for PHP integration
export default defineConfig({
  plugins: [colorRuntimeStubPlugin(), backgroundRemovalStubPlugin(), opencvStubPlugin(), react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  define: {
    // Define process for browser compatibility
    'process': JSON.stringify({ env: { NODE_ENV: 'production' } }),
    'global': 'globalThis',
    // Disable image processing features (hides CLIPPING/EDIT menus)
    'import.meta.env.VITE_ENABLE_IMAGE_PROCESSING': JSON.stringify('false'),
    // Disable ruler for embed build
    'import.meta.env.VITE_ENABLE_RULER': JSON.stringify('false'),
    // Hide menus for embed build
    'import.meta.env.VITE_ENABLE_UPLOAD_MENU': JSON.stringify('false'),
    'import.meta.env.VITE_ENABLE_TEMPLATE_MENU': JSON.stringify('false'),
    'import.meta.env.VITE_ENABLE_FRAME_MENU': JSON.stringify('false'),
    'import.meta.env.VITE_ENABLE_SMART_CODE_MENU': JSON.stringify('false'),
  },
  build: {
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
        // Ensure CSS is bundled
        assetFileNames: 'editor-bundle[extname]',
      },
    },
    // Minify to reduce bundle size and memory usage
    minify: 'esbuild',
    // Increase chunk size warning limit for single bundle
    chunkSizeWarningLimit: 20000,
  },
  optimizeDeps: {
    exclude: ['@pf/color-runtime'],
  },
})
