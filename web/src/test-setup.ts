// Node 26 defines a broken global `localStorage` (undefined unless started
// with --localstorage-file). Vitest's jsdom environment then skips copying
// jsdom's working localStorage, because the key already exists on the
// global. Restore jsdom's implementation so tests can exercise the app's
// token persistence.
declare const jsdom: { window: { localStorage: Storage } } | undefined;

if (typeof localStorage === 'undefined' && typeof jsdom !== 'undefined') {
  Object.defineProperty(globalThis, 'localStorage', {
    value: jsdom.window.localStorage,
    configurable: true,
  });
}

// jsdom does not implement matchMedia; the Theme service uses it for the
// system dark-mode preference. Stub it (never matches) for tests.
if (typeof window !== 'undefined' && typeof window.matchMedia !== 'function') {
  window.matchMedia = (query: string): MediaQueryList =>
    ({
      matches: false,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    }) as unknown as MediaQueryList;
}
