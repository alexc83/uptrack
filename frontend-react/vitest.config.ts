import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  // The Help Center renders the approved Markdown from ../context/p02-help-center.
  server: { fs: { allow: ['..'] } },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    exclude: ['e2e/**', 'e2e-live/**', 'node_modules/**', 'dist/**'],
    // D01-D: reporting only (no thresholds). Run with `npm run test:coverage`; plain `npm test` is unaffected.
    coverage: {
      provider: 'v8',
      reportsDirectory: './coverage',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        '**/*.test.{ts,tsx}', // test files
        'src/test/**', // test setup, helpers and fixtures
        '**/*.d.ts', // type declarations only
        'src/main.tsx', // browser bootstrap (createRoot); exercised by E2E, not unit tests
      ],
      reporter: ['text-summary', 'lcov', 'html', 'json-summary'],
    },
  },
});
