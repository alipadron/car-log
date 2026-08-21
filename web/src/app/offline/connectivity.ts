import { computed, Service, signal } from '@angular/core';

const deviceOnline = (): boolean =>
  typeof navigator === 'undefined' ? true : navigator.onLine;

/**
 * Tracks whether the app should be treated as offline for display purposes.
 * The banner shows when the API cannot be reached (reported by
 * {@link connectivityInterceptor}) or when the browser reports the device is
 * offline (`navigator.onLine` / the `online`/`offline` events).
 */
@Service()
export class Connectivity {
  private readonly serverUnreachable = signal(false);
  private readonly deviceOffline = signal(!deviceOnline());

  readonly unreachable = computed(() => this.serverUnreachable() || this.deviceOffline());

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.deviceOffline.set(false));
      window.addEventListener('offline', () => this.deviceOffline.set(true));
    }
  }

  /** Any HTTP response means the server answered and is reachable. */
  reportServerSuccess(): void {
    this.serverUnreachable.set(false);
  }

  /** A connection-level failure with no HTTP response means the server could not be reached. */
  reportServerFailure(): void {
    this.serverUnreachable.set(true);
  }
}
