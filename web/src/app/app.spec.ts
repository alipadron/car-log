import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { App } from './app';
import { Auth } from './auth/auth';
import { authInterceptor } from './auth/auth-interceptor';

describe('App', () => {
  let httpTesting: HttpTestingController;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    }).compileComponents();
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('shows the unlock screen when there is no token', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Password');
  });

  it('shows the app shell when a token is stored', async () => {
    TestBed.inject(Auth).setToken('api-token');
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    httpTesting.expectOne('/api/health').flush({ status: 'ok', db: 'ok' });
    await fixture.whenStable();
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent;
    expect(text).toContain('car-log');
    expect(text).toContain('API health: ok');
  });

  it('returns to the unlock screen when the API answers 401', async () => {
    TestBed.inject(Auth).setToken('expired-token');
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    httpTesting
      .expectOne('/api/health')
      .flush({ message: 'Unauthenticated.' }, { status: 401, statusText: 'Unauthorized' });
    await fixture.whenStable();
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Password');
    expect(TestBed.inject(Auth).token()).toBeNull();
  });
});
