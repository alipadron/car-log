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
