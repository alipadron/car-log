import { effect, Service, signal } from '@angular/core';

const THEME_STORAGE_KEY = 'car-log.theme';

/**
 * Light/dark theme. spartan's variables switch on the `.dark` class on
 * `<html>`; the choice is persisted in localStorage, defaulting to the
 * system preference when nothing is stored.
 */
@Service()
export class Theme {
  private readonly darkMode = signal(Theme.initialDark());

  readonly dark = this.darkMode.asReadonly();

  constructor() {
    effect(() => {
      document.documentElement.classList.toggle('dark', this.darkMode());
    });
  }

  toggle(): void {
    const next = !this.darkMode();
    localStorage.setItem(THEME_STORAGE_KEY, next ? 'dark' : 'light');
    this.darkMode.set(next);
  }

  private static initialDark(): boolean {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored !== null) {
      return stored === 'dark';
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
}
