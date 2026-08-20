import { TestBed } from '@angular/core/testing';

import { Theme } from './theme';

describe('Theme', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
  });

  it('defaults to the system preference (light in tests)', () => {
    const theme = TestBed.inject(Theme);

    expect(theme.dark()).toBe(false);
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('toggles the dark class on <html> and persists the choice', () => {
    const theme = TestBed.inject(Theme);

    theme.toggle();
    TestBed.tick();

    expect(theme.dark()).toBe(true);
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(localStorage.getItem('car-log.theme')).toBe('dark');
  });

  it('honours a stored choice over the system preference', () => {
    localStorage.setItem('car-log.theme', 'dark');

    const theme = TestBed.inject(Theme);

    expect(theme.dark()).toBe(true);
  });
});
