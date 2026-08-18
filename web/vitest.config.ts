import { defineConfig } from 'vitest/config';

// jsdom defaults to an opaque origin, where localStorage is unavailable.
// Give tests a real origin so the app's token persistence can run against
// a working localStorage.
export default defineConfig({
  test: {
    environmentOptions: {
      jsdom: {
        url: 'http://localhost/',
      },
    },
  },
});
