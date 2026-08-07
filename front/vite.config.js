import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    server: {
        host: true,
        strictPort: true,
        port: 5173,
        hmr: {
            host: 'localhost',
            port: 5173,
            clientPort: 5173,
            protocol: 'ws',
        },
        watch: {
            usePolling: true,
        },
        proxy: {
            '/api': {
                target: 'http://localhost:8000',
                changeOrigin: true,
                secure: false,
            },
        },
    },
});
