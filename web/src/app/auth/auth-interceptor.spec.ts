import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { Auth } from './auth';
import { authInterceptor } from './auth-interceptor';

describe('authInterceptor', () => {
  let http: HttpClient;
  let httpTesting: HttpTestingController;
  let auth: Auth;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    httpTesting = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(Auth);
  });

  afterEach(() => httpTesting.verify());

  it('attaches the stored token to requests', () => {
    auth.setToken('api-token');

    http.get('/api/health').subscribe();

    const req = httpTesting.expectOne('/api/health');
    expect(req.request.headers.get('Authorization')).toBe('Bearer api-token');
    req.flush({});
  });

  it('sends no Authorization header when locked', () => {
    http.get('/api/health').subscribe();

    const req = httpTesting.expectOne('/api/health');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });

  it('locks the app when the API answers 401', () => {
    auth.setToken('api-token');

    http.get('/api/health').subscribe({ error: () => {} });

    httpTesting
      .expectOne('/api/health')
      .flush({ message: 'Unauthenticated.' }, { status: 401, statusText: 'Unauthorized' });

    expect(auth.token()).toBeNull();
    expect(localStorage.getItem('car-log.token')).toBeNull();
  });

  it('keeps the token on other errors', () => {
    auth.setToken('api-token');

    http.get('/api/health').subscribe({ error: () => {} });

    httpTesting.expectOne('/api/health').flush({}, { status: 500, statusText: 'Server Error' });

    expect(auth.token()).toBe('api-token');
  });
});
