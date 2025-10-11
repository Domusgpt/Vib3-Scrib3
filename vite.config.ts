import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    const apiTarget = env.VITE_DEV_API_URL || env.VITE_API_BASE_URL || 'http://localhost:3001';

    return {
        server: {
            port: 3000,
            host: '0.0.0.0',
            proxy: {
                '/auth': {
                    target: apiTarget,
                    changeOrigin: true,
                    secure: false,
                },
                '/api': {
                    target: apiTarget,
                    changeOrigin: true,
                    secure: false,
                },
            },
        },
        plugins: [react()],
        define: {
            'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
            'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        },
        resolve: {
            alias: {
                '@': path.resolve(__dirname, '.'),
            },
        },
    };
});
