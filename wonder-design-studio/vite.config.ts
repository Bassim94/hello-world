import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// base './' so the built app can be hosted from any sub-path or static host.
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
});
