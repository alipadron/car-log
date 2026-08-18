import { Service, signal } from '@angular/core';

const TOKEN_STORAGE_KEY = 'car-log.token';

/**
 * Holds the API token that unlocks the app. The token is persisted in
 * localStorage so a device stays unlocked across sessions; a 401 from the
 * API (see authInterceptor) clears it, returning the app to the unlock
 * screen.
 */
@Service()
export class Auth {
  private readonly storedToken = signal<string | null>(localStorage.getItem(TOKEN_STORAGE_KEY));

  readonly token = this.storedToken.asReadonly();

  setToken(token: string): void {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
    this.storedToken.set(token);
  }

  lock(): void {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    this.storedToken.set(null);
  }
}
