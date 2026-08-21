import { Service } from '@angular/core';

import { VehicleHome } from '../home/home-api';

const HOME_ENTRY_KEY = 'car-log.home';

/**
 * Persists the latest home screen payload on-device so it can be shown from
 * cache while the server is unreachable. Backed by localStorage (a single
 * small snapshot; the offline-capture outbox in issue #10 uses IndexedDB
 * instead).
 */
@Service()
export class HomeCache {
  async save(data: VehicleHome[]): Promise<void> {
    localStorage.setItem(HOME_ENTRY_KEY, JSON.stringify(data));
  }

  async get(): Promise<VehicleHome[] | null> {
    const raw = localStorage.getItem(HOME_ENTRY_KEY);
    if (raw === null) return null;
    try {
      return JSON.parse(raw) as VehicleHome[];
    } catch {
      return null;
    }
  }
}
