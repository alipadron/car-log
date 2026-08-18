import { TestBed } from '@angular/core/testing';

import { Auth } from './auth';

describe('Auth', () => {
  beforeEach(() => localStorage.clear());

  it('starts locked when no token is stored', () => {
    expect(TestBed.inject(Auth).token()).toBeNull();
  });

  it('restores the stored token from a previous session', () => {
    localStorage.setItem('car-log.token', 'stored-token');

    expect(TestBed.inject(Auth).token()).toBe('stored-token');
  });

  it('persists the token when set', () => {
    const auth = TestBed.inject(Auth);

    auth.setToken('new-token');

    expect(auth.token()).toBe('new-token');
    expect(localStorage.getItem('car-log.token')).toBe('new-token');
  });

  it('clears the token on lock', () => {
    const auth = TestBed.inject(Auth);
    auth.setToken('new-token');

    auth.lock();

    expect(auth.token()).toBeNull();
    expect(localStorage.getItem('car-log.token')).toBeNull();
  });
});
