import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import viteCompression from 'vite-plugin-compression';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [
      react(),
      viteCompression({
        algorithm: 'gzip',
        ext: '.gz',
        threshold: 10240
      }),
      viteCompression({
        algorithm: 'brotliCompress',
        ext: '.br',
        threshold: 10240
      })
    ],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    },
    build: {
      minify: 'esbuild',
      cssMinify: true,
      target: 'es2020',
      reportCompressedSize: true,
      rollupOptions: {
        output: {
          manualChunks(id) {
            const normalizedId = id.split(path.sep).join('/');

            if (
              normalizedId.endsWith('/components/AdminView.tsx') ||
              normalizedId.endsWith('/components/AdminLogin.tsx')
            ) {
              return 'admin-ui';
            }

            if (
              normalizedId.endsWith('/firebaseAuth.ts') ||
              normalizedId.endsWith('/firebaseAuthClient.ts')
            ) {
              return 'admin-auth';
            }

            if (normalizedId.endsWith('/firebaseStore.ts')) {
              return 'firebase-store';
            }

            if (!normalizedId.includes('node_modules')) return undefined;

            if (normalizedId.includes('react') || normalizedId.includes('scheduler')) {
              return 'react-vendor';
            }

            if (normalizedId.includes('firebase/auth') || normalizedId.includes('@firebase/auth')) {
              return 'firebase-auth';
            }

            if (normalizedId.includes('firebase/firestore') || normalizedId.includes('@firebase/firestore')) {
              return 'firebase-firestore-core';
            }

            if (
              normalizedId.includes('@grpc') ||
              normalizedId.includes('protobufjs') ||
              normalizedId.includes('long') ||
              normalizedId.includes('proto3-json-serializer')
            ) {
              return 'firebase-proto';
            }

            if (normalizedId.includes('idb')) {
              return 'firebase-idb';
            }

            if (normalizedId.includes('firebase/app') || normalizedId.includes('@firebase/app')) {
              return 'firebase-core';
            }

            if (normalizedId.includes('firebase')) {
              return 'firebase-misc';
            }

            return 'vendor';
          }
        }
      }
    }
  };
});
