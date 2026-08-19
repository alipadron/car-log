import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { Vehicle } from './vehicles-api';
import { Vehicles } from './vehicles';

function makeVehicle(overrides: Partial<Vehicle> = {}): Vehicle {
  return {
    id: 1,
    uuid: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    name: 'Daily driver',
    type: 'car',
    make: 'Toyota',
    model: 'Corolla',
    year: 2015,
    created_at: '2026-08-19T00:00:00+00:00',
    ...overrides,
  };
}

describe('Vehicles', () => {
  let httpTesting: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Vehicles],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  /**
   * Flush in-flight requests and let promise continuations settle, then
   * render. Zoneless whenStable() can resolve before the async/await chain
   * after a flushed request finishes, so wait a macrotask too.
   */
  async function settle(fixture: ComponentFixture<Vehicles>): Promise<void> {
    await fixture.whenStable();
    await new Promise((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();
  }

  async function renderWith(vehicles: Vehicle[]): Promise<ComponentFixture<Vehicles>> {
    const fixture = TestBed.createComponent(Vehicles);
    fixture.detectChanges();

    httpTesting.expectOne('/api/vehicles').flush({ data: vehicles });
    await settle(fixture);

    return fixture;
  }

  function element(fixture: ComponentFixture<Vehicles>): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  function clickButton(fixture: ComponentFixture<Vehicles>, text: string): void {
    const button = [...element(fixture).querySelectorAll('button')].find(
      (candidate) => candidate.textContent?.trim() === text,
    );
    expect(button, `button "${text}"`).toBeTruthy();
    button!.click();
  }

  function setInput(fixture: ComponentFixture<Vehicles>, id: string, value: string): void {
    const input = element(fixture).querySelector<HTMLInputElement>(`#${id}`)!;
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function submitForm(fixture: ComponentFixture<Vehicles>): void {
    element(fixture)
      .querySelector('form')!
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  }

  it('lists the vehicles', async () => {
    const fixture = await renderWith([
      makeVehicle(),
      makeVehicle({ id: 2, name: 'Trail bike', type: 'bike', make: 'Yamaha', model: 'XTZ' }),
    ]);

    const text = element(fixture).textContent;
    expect(text).toContain('Daily driver');
    expect(text).toContain('Toyota Corolla · 2015 · car');
    expect(text).toContain('Trail bike');
  });

  it('shows an error when the list cannot be loaded', async () => {
    const fixture = TestBed.createComponent(Vehicles);
    fixture.detectChanges();

    httpTesting.expectOne('/api/vehicles').error(new ProgressEvent('error'));
    await settle(fixture);

    expect(element(fixture).textContent).toContain('Could not load your vehicles.');
  });

  it('creates a vehicle with a client-generated uuid', async () => {
    const fixture = await renderWith([]);
    clickButton(fixture, 'Add vehicle');
    fixture.detectChanges();

    setInput(fixture, 'name', 'Daily driver');
    setInput(fixture, 'make', 'Toyota');
    setInput(fixture, 'model', 'Corolla');
    setInput(fixture, 'year', '2015');
    submitForm(fixture);

    const req = httpTesting.expectOne('/api/vehicles');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      uuid: expect.any(String),
      name: 'Daily driver',
      type: 'car',
      make: 'Toyota',
      model: 'Corolla',
      year: 2015,
    });
    req.flush({ data: makeVehicle() });
    await settle(fixture);

    expect(element(fixture).textContent).toContain('Daily driver');
  });

  it('does not call the API while the form is invalid', async () => {
    const fixture = await renderWith([]);
    clickButton(fixture, 'Add vehicle');
    fixture.detectChanges();

    submitForm(fixture);

    httpTesting.expectNone('/api/vehicles', 'no create request');
  });

  it('edits a vehicle', async () => {
    const fixture = await renderWith([makeVehicle()]);
    clickButton(fixture, 'Edit');
    fixture.detectChanges();

    expect(element(fixture).querySelector<HTMLInputElement>('#name')!.value).toBe('Daily driver');
    expect(element(fixture).querySelector<HTMLSelectElement>('#type')!.value).toBe('car');

    setInput(fixture, 'name', 'Weekend car');
    submitForm(fixture);

    const req = httpTesting.expectOne('/api/vehicles/1');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({
      name: 'Weekend car',
      type: 'car',
      make: 'Toyota',
      model: 'Corolla',
      year: 2015,
    });
    req.flush({ data: makeVehicle({ name: 'Weekend car' }) });
    await settle(fixture);

    expect(element(fixture).textContent).toContain('Weekend car');
  });

  it('deletes a vehicle only after confirmation', async () => {
    const fixture = await renderWith([makeVehicle()]);
    clickButton(fixture, 'Delete');
    fixture.detectChanges();

    expect(element(fixture).textContent).toContain('Delete Daily driver?');
    httpTesting.expectNone('/api/vehicles/1');

    clickButton(fixture, 'Delete it');
    const req = httpTesting.expectOne('/api/vehicles/1');
    expect(req.request.method).toBe('DELETE');
    req.flush(null, { status: 204, statusText: 'No Content' });
    await settle(fixture);

    expect(element(fixture).textContent).not.toContain('Toyota Corolla');
  });

  it('keeps the vehicle when the delete is cancelled', async () => {
    const fixture = await renderWith([makeVehicle()]);
    clickButton(fixture, 'Delete');
    fixture.detectChanges();

    clickButton(fixture, 'Keep it');
    fixture.detectChanges();

    expect(element(fixture).textContent).toContain('Daily driver');
    expect(element(fixture).textContent).not.toContain('This cannot be undone');
    httpTesting.expectNone('/api/vehicles/1');
  });

  it('shows an error when saving fails', async () => {
    const fixture = await renderWith([]);
    clickButton(fixture, 'Add vehicle');
    fixture.detectChanges();

    setInput(fixture, 'name', 'Daily driver');
    setInput(fixture, 'make', 'Toyota');
    setInput(fixture, 'model', 'Corolla');
    setInput(fixture, 'year', '2015');
    submitForm(fixture);

    httpTesting.expectOne('/api/vehicles').error(new ProgressEvent('error'));
    await settle(fixture);

    expect(element(fixture).textContent).toContain('Could not save the vehicle.');
  });
});
