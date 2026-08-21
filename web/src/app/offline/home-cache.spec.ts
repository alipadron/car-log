import { TestBed } from '@angular/core/testing';

import { VehicleHome } from '../home/home-api';
import { HomeCache } from './home-cache';

function vehicle(overrides: Partial<VehicleHome> = {}): VehicleHome {
  return {
    id: 1,
    name: 'Daily driver',
    type: 'car',
    make: 'Toyota',
    model: 'Corolla',
    year: 2015,
    current_odometer: 120000,
    due_items: [],
    recent_activity: [],
    ...overrides,
  };
}

describe('HomeCache', () => {
  beforeEach(() => localStorage.clear());

  it('returns null when no snapshot has been saved', async () => {
    const cache = TestBed.inject(HomeCache);

    expect(await cache.get()).toBeNull();
  });

  it('round-trips the last-known home payload', async () => {
    const cache = TestBed.inject(HomeCache);

    await cache.save([vehicle()]);
    expect(localStorage.getItem('car-log.home')).toBeTruthy();

    expect(await cache.get()).toEqual([vehicle()]);
  });

  it('overwrites the previous snapshot on save', async () => {
    const cache = TestBed.inject(HomeCache);

    await cache.save([vehicle()]);
    await cache.save([
      vehicle({ id: 2, name: 'Trail bike', type: 'bike', make: 'Yamaha', model: 'XTZ', current_odometer: null }),
    ]);

    const result = await cache.get();
    expect(result).toHaveLength(1);
    expect(result![0].name).toBe('Trail bike');
  });

  it('returns null when the stored entry is not valid JSON', async () => {
    localStorage.setItem('car-log.home', 'not-json');
    const cache = TestBed.inject(HomeCache);

    expect(await cache.get()).toBeNull();
  });
});
