import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

// jsdom defaults to an opaque origin, where localStorage is unavailable.
// Give tests a real origin so the app's token persistence can run against
// a working localStorage.
export default defineConfig({
  resolve: {
    // Mirror the `paths` mapping in tsconfig.json so raw `vitest` runs (as
    // opposed to `ng test`, which reads tsconfig itself) resolve the
    // vendored spartan helm components.
    alias: {
      '@spartan-ng/helm/button': resolve(__dirname, 'libs/ui/button/src/index.ts'),
      '@spartan-ng/helm/utils': resolve(__dirname, 'libs/ui/utils/src/index.ts'),
      '@spartan-ng/helm/input': resolve(__dirname, 'libs/ui/input/src/index.ts'),
      '@spartan-ng/helm/label': resolve(__dirname, 'libs/ui/label/src/index.ts'),
      '@spartan-ng/helm/card': resolve(__dirname, 'libs/ui/card/src/index.ts'),
      '@spartan-ng/helm/alert': resolve(__dirname, 'libs/ui/alert/src/index.ts'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    environmentOptions: {
      jsdom: {
        url: 'http://localhost/',
      },
    },
  },
});
