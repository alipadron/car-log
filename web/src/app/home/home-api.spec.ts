import { HttpClient, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { HomeCache } from '../offline/home-cache';
import { HomeApi, VehicleHome } from './home-api';

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

describe('HomeApi', () => {
  let http: HttpClient;
  let testing: HttpTestingController;
  let api: HomeApi;
  let cache: HomeCache;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpClient);
    testing = TestBed.inject(HttpTestingController);
    api = TestBed.inject(HomeApi);
    cache = TestBed.inject(HomeCache);
  });

  afterEach(() => testing.verify());

  it('returns the server payload and caches it', async () => {
    const promise = api.get();

    testing.expectOne('/api/home').flush({ data: [vehicle()] });

    await expect(promise).resolves.toEqual([vehicle()]);
    const cached = await cache.get();
    expect(cached).toEqual([vehicle()]);
  });

  it('serves the last-known snapshot when the server is unreachable', async () => {
    await cache.save([vehicle()]);

    const promise = api.get();

    testing.expectOne('/api/home').error(new ProgressEvent('error'));

    await expect(promise).resolves.toEqual([vehicle()]);
  });

  it('rejects when offline and there is no cached snapshot', async () => {
    const promise = api.get();

    testing.expectOne('/api/home').error(new ProgressEvent('error'));

    await expect(promise).rejects.toBeDefined();
  });

  it('rejects on an HTTP error even when a stale snapshot exists', async () => {
    await cache.save([vehicle()]);

    const promise = api.get();

    testing.expectOne('/api/home').flush({}, { status: 500, statusText: 'Server Error' });

    await expect(promise).rejects.toBeDefined();
  });

  it('refreshes the cache with the newest server data', async () => {
    await cache.save([vehicle()]);

    const promise = api.get();

    testing
      .expectOne('/api/home')
      .flush({ data: [vehicle({ id: 2, name: 'Trail bike', type: 'bike' })] });
    await expect(promise).resolves.toEqual([vehicle({ id: 2, name: 'Trail bike', type: 'bike' })]);

    const cached = await cache.get();
    expect(cached?.[0].name).toBe('Trail bike');
  });
});
