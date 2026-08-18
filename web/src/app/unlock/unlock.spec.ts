import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { Auth } from '../auth/auth';
import { Unlock } from './unlock';

describe('Unlock', () => {
  let httpTesting: HttpTestingController;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [Unlock],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  function typePassword(fixture: { nativeElement: HTMLElement }, password: string): void {
    const input = fixture.nativeElement.querySelector<HTMLInputElement>('#password')!;
    input.value = password;
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function submitForm(fixture: { nativeElement: HTMLElement }): void {
    fixture.nativeElement
      .querySelector('form')!
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  }

  it('exchanges the password for a token and stores it', async () => {
    const fixture = TestBed.createComponent(Unlock);
    fixture.detectChanges();

    typePassword(fixture, 'secret');
    submitForm(fixture);

    const req = httpTesting.expectOne('/api/auth/token');
    expect(req.request.body).toEqual({ password: 'secret' });
    req.flush({ token: 'api-token' });
    await fixture.whenStable();

    expect(TestBed.inject(Auth).token()).toBe('api-token');
    expect(localStorage.getItem('car-log.token')).toBe('api-token');
  });

  it('shows an error when the password is wrong', async () => {
    const fixture = TestBed.createComponent(Unlock);
    fixture.detectChanges();

    typePassword(fixture, 'wrong');
    submitForm(fixture);

    httpTesting
      .expectOne('/api/auth/token')
      .flush({ message: 'Invalid password.' }, { status: 401, statusText: 'Unauthorized' });
    await fixture.whenStable();
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Wrong password.');
    expect(TestBed.inject(Auth).token()).toBeNull();
  });

  it('shows an error when the server is unreachable', async () => {
    const fixture = TestBed.createComponent(Unlock);
    fixture.detectChanges();

    typePassword(fixture, 'secret');
    submitForm(fixture);

    httpTesting.expectOne('/api/auth/token').error(new ProgressEvent('error'));
    await fixture.whenStable();
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'Could not reach the server.',
    );
  });

  it('does not call the API when the password is empty', () => {
    const fixture = TestBed.createComponent(Unlock);
    fixture.detectChanges();

    submitForm(fixture);

    httpTesting.expectNone('/api/auth/token');
  });
});
