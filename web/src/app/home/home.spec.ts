import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HomeCache } from '../offline/home-cache';
import { Outbox } from '../offline/outbox';
import { FakeOutbox } from '../offline/outbox.fake';
import { Home } from './home';
import { VehicleHome } from './home-api';

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

describe('Home', () => {
  let testing: HttpTestingController;
  let cache: HomeCache;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [Home],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    // Home renders the pending-sync banner via Sync, which reads the outbox;
    // give it an in-memory store since jsdom has no IndexedDB.
    TestBed.overrideProvider(Outbox, { useValue: new FakeOutbox() });
    testing = TestBed.inject(HttpTestingController);
    cache = TestBed.inject(HomeCache);
  });

  afterEach(() => testing.verify());

  async function settle(fixture: ComponentFixture<Home>): Promise<void> {
    await fixture.whenStable();
    await new Promise((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();
  }

  function flushSettings(): void {
    testing
      .expectOne('/api/settings')
      .flush({ data: { id: 1, language: 'en', distance_unit: 'km', currency: 'USD', updated_at: '2026-08-20T00:00:00Z' } });
  }

  it('renders the last-known snapshot when the server is unreachable', async () => {
    await cache.save([vehicle()]);
    const fixture = TestBed.createComponent(Home);
    fixture.detectChanges();
    flushSettings();

    testing.expectOne('/api/home').error(new ProgressEvent('error'));
    await settle(fixture);

    const text = (fixture.nativeElement as HTMLElement).textContent;
    expect(text).toContain('Daily driver');
    expect(text).not.toContain('Check your connection');
  });

  it('shows an error when offline and there is no cached snapshot', async () => {
    const fixture = TestBed.createComponent(Home);
    fixture.detectChanges();
    flushSettings();

    testing.expectOne('/api/home').error(new ProgressEvent('error'));
    await settle(fixture);

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Check your connection');
  });
});
