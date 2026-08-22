import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { Connectivity } from './connectivity';
import { connectivityInterceptor } from './connectivity-interceptor';
import { Outbox } from './outbox';
import { FakeOutbox } from './outbox.fake';

describe('connectivityInterceptor', () => {
  let http: HttpClient;
  let testing: HttpTestingController;
  let connectivity: Connectivity;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([connectivityInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    // The interceptor now triggers the outbox replay (via Sync) on every
    // response; give it an in-memory store since jsdom has no IndexedDB.
    TestBed.overrideProvider(Outbox, { useValue: new FakeOutbox() });
    http = TestBed.inject(HttpClient);
    testing = TestBed.inject(HttpTestingController);
    connectivity = TestBed.inject(Connectivity);
  });

  afterEach(() => testing.verify());

  it('reports the server reachable on a successful response', () => {
    connectivity.reportServerFailure();
    expect(connectivity.unreachable()).toBe(true);

    http.get('/api/home').subscribe();

    testing.expectOne('/api/home').flush({ data: [] });

    expect(connectivity.unreachable()).toBe(false);
  });

  it('keeps the server reachable on a 4xx response', () => {
    http.get('/api/home').subscribe({ error: () => {} });

    testing.expectOne('/api/home').flush({}, { status: 404, statusText: 'Not Found' });

    expect(connectivity.unreachable()).toBe(false);
  });

  it('keeps the server reachable on a 5xx response', () => {
    http.get('/api/home').subscribe({ error: () => {} });

    testing.expectOne('/api/home').flush({}, { status: 503, statusText: 'Service Unavailable' });

    expect(connectivity.unreachable()).toBe(false);
  });

  it('reports the server unreachable on a network/connection error', () => {
    http.get('/api/home').subscribe({ error: () => {} });

    testing.expectOne('/api/home').error(new ProgressEvent('error'));

    expect(connectivity.unreachable()).toBe(true);
  });

  it('recovers when a later request succeeds', () => {
    connectivity.reportServerFailure();
    expect(connectivity.unreachable()).toBe(true);

    http.get('/api/home').subscribe();

    testing.expectOne('/api/home').flush({ data: [] });

    expect(connectivity.unreachable()).toBe(false);
  });
});
