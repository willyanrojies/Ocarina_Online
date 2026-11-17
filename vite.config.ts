import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // O HMR fica desativado quando DISABLE_HMR="true" para evitar recarregamentos durante edições.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Desativa o observador de arquivos quando DISABLE_HMR está ativo para economizar CPU.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
