import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { App } from './app';
import { Auth } from './auth/auth';
import { authInterceptor } from './auth/auth-interceptor';
import { connectivityInterceptor } from './offline/connectivity-interceptor';
import { Outbox } from './offline/outbox';
import { FakeOutbox } from './offline/outbox.fake';

describe('App', () => {
  let httpTesting: HttpTestingController;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideHttpClient(withInterceptors([authInterceptor, connectivityInterceptor])),
        provideHttpClientTesting(),
      ],
    }).compileComponents();
    // The connectivity interceptor triggers the outbox replay (via Sync) on
    // every response; give it an in-memory store since jsdom has no IndexedDB.
    TestBed.overrideProvider(Outbox, { useValue: new FakeOutbox() });
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('shows the unlock screen when there is no token', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    httpTesting
      .expectOne('/api/settings')
      .flush({ data: { id: 1, language: 'en', distance_unit: 'km', currency: 'USD', updated_at: '2026-08-20T00:00:00Z' } });

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Password');
  });

  it('shows the home screen by default when logged in', async () => {
    TestBed.inject(Auth).setToken('api-token');
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    httpTesting
      .expectOne('/api/settings')
      .flush({ data: { id: 1, language: 'en', distance_unit: 'km', currency: 'USD', updated_at: '2026-08-20T00:00:00Z' } });
    httpTesting
      .expectOne('/api/home')
      .flush({ data: [] });
    await fixture.whenStable();
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent;
    expect(text).toContain('car-log');
  });

  it('shows the vehicles list when switching to vehicles tab', async () => {
    TestBed.inject(Auth).setToken('api-token');
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    httpTesting
      .expectOne('/api/settings')
      .flush({ data: { id: 1, language: 'en', distance_unit: 'km', currency: 'USD', updated_at: '2026-08-20T00:00:00Z' } });
    httpTesting.expectOne('/api/home').flush({ data: [] });
    await fixture.whenStable();
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent;
    expect(text).toContain('car-log');
  });

  it('returns to the unlock screen when the API answers 401', async () => {
    TestBed.inject(Auth).setToken('expired-token');
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    httpTesting
      .expectOne('/api/settings')
      .flush({ data: { id: 1, language: 'en', distance_unit: 'km', currency: 'USD', updated_at: '2026-08-20T00:00:00Z' } });
    httpTesting
      .expectOne('/api/home')
      .flush({ message: 'Unauthenticated.' }, { status: 401, statusText: 'Unauthorized' });
    await fixture.whenStable();
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Password');
    expect(TestBed.inject(Auth).token()).toBeNull();
  });

  it('shows the offline banner when the server is unreachable', async () => {
    TestBed.inject(Auth).setToken('api-token');
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    httpTesting
      .expectOne('/api/settings')
      .flush({ data: { id: 1, language: 'en', distance_unit: 'km', currency: 'USD', updated_at: '2026-08-20T00:00:00Z' } });
    httpTesting.expectOne('/api/home').error(new ProgressEvent('error'));
    await fixture.whenStable();
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain("You're offline");
  });
});
