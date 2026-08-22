// Angular's JIT compiler is needed when running raw `vitest` (single spec
// files); `ng test` provides its own linker-based transform.
import '@angular/compiler';

import { NgModule } from '@angular/core';
import { TestComponentRenderer, getTestBed } from '@angular/core/testing';
import { ɵgetDOM } from '@angular/common';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';

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

// Bootstrap the Angular TestBed. The `ng test` builder injects an identical
// setup guarded by the same symbol, so exactly one of them initializes the
// environment no matter which runner starts first.
const ANGULAR_TESTBED_SETUP = Symbol.for('@angular/cli/testbed-setup');

if (!(globalThis as Record<symbol, unknown>)[ANGULAR_TESTBED_SETUP]) {
  (globalThis as Record<symbol, unknown>)[ANGULAR_TESTBED_SETUP] = true;

  class DynamicDOMTestComponentRenderer extends TestComponentRenderer {
    override insertRootElement(rootElId: string): void {
      this.removeAllRootElements();
      const doc = ɵgetDOM().getDefaultDocument();
      if (!doc || !doc.body) return;
      const rootElement = doc.createElement('div');
      rootElement.setAttribute('id', rootElId);
      doc.body.appendChild(rootElement);
    }

    override removeAllRootElements(): void {
      const doc = ɵgetDOM().getDefaultDocument();
      if (!doc) return;
      const oldRoots = doc.querySelectorAll('[id^=root]');
      for (const oldRoot of Array.from(oldRoots)) {
        doc.body.removeChild(oldRoot);
      }
    }
  }

  @NgModule({
    providers: [{ provide: TestComponentRenderer, useClass: DynamicDOMTestComponentRenderer }],
  })
  class TestModule {}

  getTestBed().initTestEnvironment([BrowserTestingModule, TestModule], platformBrowserTesting(), {
    errorOnUnknownElements: true,
    errorOnUnknownProperties: true,
  });
}