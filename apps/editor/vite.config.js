import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
// @pf/color-runtime optional dependency를 스텁으로 대체하는 플러그인
function colorRuntimeStubPlugin() {
    var virtualModuleId = '@pf/color-runtime';
    var resolvedVirtualModuleId = '\0' + virtualModuleId;
    var stubCode = "\n    export const cmykToRgb = async () => { throw new Error('not available') }\n    export const rgbToCmyk = async () => { throw new Error('not available') }\n    export const transformImageDataToProfile = async () => { throw new Error('not available') }\n    export default { cmykToRgb, rgbToCmyk, transformImageDataToProfile }\n  ";
    return {
        name: 'color-runtime-stub',
        enforce: 'pre',
        resolveId: function (id, importer, options) {
            if (id === virtualModuleId) {
                return { id: resolvedVirtualModuleId, moduleSideEffects: false };
            }
        },
        load: function (id) {
            if (id === resolvedVirtualModuleId) {
                return stubCode;
            }
        },
    };
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
});
