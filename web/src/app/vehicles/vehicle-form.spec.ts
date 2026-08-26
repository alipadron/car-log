import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { Connectivity } from '../offline/connectivity';
import { Settings } from '../settings/settings';
import { VehicleForm } from './vehicle-form';

describe('VehicleForm', () => {
  let httpTesting: HttpTestingController;
  let fixture: ComponentFixture<VehicleForm>;

  function element(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  async function flushSettings(language = 'en'): Promise<void> {
    httpTesting
      .expectOne('/api/settings')
      .flush({
        data: {
          id: 1,
          language,
          distance_unit: 'km',
          currency: 'USD',
          updated_at: '2026-08-20T00:00:00Z',
        },
      });
    await fixture.whenStable();
    fixture.detectChanges();
  }

  function submitEmpty(): void {
    submitForm();
  }

  function submitForm(): void {
    element()
      .querySelector('form')!
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    fixture.detectChanges();
  }

  function setInput(selector: string, value: string): void {
    const input = element().querySelector<HTMLInputElement>(selector)!;
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VehicleForm],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    httpTesting = TestBed.inject(HttpTestingController);

    fixture = TestBed.createComponent(VehicleForm);
    fixture.detectChanges();
    await flushSettings();
  });

  afterEach(() => httpTesting.verify());

  it('shows validation errors in English by default', () => {
    submitEmpty();

    const text = element().textContent;
    expect(text).toContain('Enter a name.');
    expect(text).toContain('Enter the make.');
    expect(text).toContain('Enter the model.');
    expect(text).toContain('Enter the year.');
  });

  it('shows validation errors in Spanish after language switch', async () => {
    submitEmpty();

    const text = element().textContent;
    expect(text).toContain('Enter a name.');

    // Switch language to Spanish
    const settings = TestBed.inject(Settings);
    const updatePromise = settings.update({ language: 'es' });

    // Flush the PUT /api/settings request
    const putReq = httpTesting.expectOne('/api/settings');
    putReq.flush({
      data: {
        id: 1,
        language: 'es',
        distance_unit: 'km',
        currency: 'USD',
        updated_at: '2026-08-20T00:00:00Z',
      },
    });

    await updatePromise;
    fixture.detectChanges();

    const updatedText = element().textContent;
    expect(updatedText).toContain('Ingresa un nombre.');
    expect(updatedText).toContain('Ingresa la marca.');
    expect(updatedText).toContain('Ingresa el modelo.');
    expect(updatedText).toContain('Ingresa el año.');
  });

  it('fails fast with an offline message instead of saving when the server is unreachable', () => {
    TestBed.inject(Connectivity).reportServerFailure();
    fixture.detectChanges();

    setInput('#name', 'My Car');
    setInput('#make', 'Toyota');
    setInput('#model', 'Corolla');
    setInput('#year', '2020');

    submitForm();

    expect(element().textContent).toContain(
      'Vehicles can only be saved when the server is reachable.',
    );
  });
});
