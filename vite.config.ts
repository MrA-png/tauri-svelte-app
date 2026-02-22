import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	worker: {
		format: 'es',
	},
	optimizeDeps: {
		exclude: ['@xenova/transformers'],
	},
	build: {
		target: 'esnext',
	},
	server: {
		headers: {
			// Required for SharedArrayBuffer used by WASM workers
			'Cross-Origin-Opener-Policy': 'same-origin',
			'Cross-Origin-Embedder-Policy': 'require-corp',
		},
	},
});
