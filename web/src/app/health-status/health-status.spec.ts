import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { HealthStatus } from './health-status';

describe('HealthStatus', () => {
  let httpTesting: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HealthStatus],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('displays the API health check result', async () => {
    const fixture = TestBed.createComponent(HealthStatus);
    fixture.detectChanges();

    httpTesting.expectOne('/api/health').flush({ status: 'ok', db: 'ok' });
    await fixture.whenStable();
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('ok');
  });

  it('shows an error state when the API is unreachable', async () => {
    const fixture = TestBed.createComponent(HealthStatus);
    fixture.detectChanges();

    httpTesting.expectOne('/api/health').error(new ProgressEvent('error'));
    await fixture.whenStable();
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('unreachable');
  });
});
