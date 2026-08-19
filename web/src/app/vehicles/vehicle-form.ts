import { Component, inject, input, linkedSignal, output, signal } from '@angular/core';
import { FormField, form, pattern, required, submit, validate } from '@angular/forms/signals';

import { Vehicle, VehiclePayload, VehiclesApi, VehicleType } from './vehicles-api';

interface VehicleFormModel {
  name: string;
  type: VehicleType;
  make: string;
  model: string;
  year: string;
}

/**
 * Create/edit form for a single vehicle. `vehicle` is null when adding.
 * Emits `saved` with the server-returned vehicle, or `cancelled`.
 */
@Component({
  selector: 'app-vehicle-form',
  imports: [FormField],
  templateUrl: './vehicle-form.html',
})
export class VehicleForm {
  private readonly api = inject(VehiclesApi);

  readonly vehicle = input<Vehicle | null>(null);
  readonly saved = output<Vehicle>();
  readonly cancelled = output<void>();

  protected readonly model = linkedSignal<VehicleFormModel>(() => {
    const vehicle = this.vehicle();
    return {
      name: vehicle?.name ?? '',
      type: vehicle?.type ?? 'car',
      make: vehicle?.make ?? '',
      model: vehicle?.model ?? '',
      year: vehicle ? String(vehicle.year) : '',
    };
  });

  protected readonly vehicleForm = form(this.model, (path) => {
    required(path.name, { message: 'Enter a name.' });
    required(path.make, { message: 'Enter the make.' });
    required(path.model, { message: 'Enter the model.' });
    required(path.year, { message: 'Enter the year.' });
    pattern(path.year, /^\d{4}$/, { message: 'Enter a valid year.' });
    // Mirrors the server's year range (VehicleController::vehicleRules).
    validate(path.year, (ctx) => {
      const raw = ctx.value();
      if (raw === '') {
        return null;
      }
      const year = Number(raw);
      return Number.isInteger(year) && year >= 1886 && year <= 2100
        ? null
        : { kind: 'yearRange', message: 'Enter a year between 1886 and 2100.' };
    });
  });

  protected readonly error = signal<string | null>(null);
  protected readonly submitting = signal(false);

  protected save(): void {
    submit(this.vehicleForm, async () => {
      this.error.set(null);
      this.submitting.set(true);

      try {
        const value = this.model();
        const payload: VehiclePayload = {
          name: value.name,
          type: value.type,
          make: value.make,
          model: value.model,
          year: Number(value.year),
        };

        const existing = this.vehicle();
        const saved = existing
          ? await this.api.update(existing.id, payload)
          : await this.api.create({ uuid: crypto.randomUUID(), ...payload });

        this.saved.emit(saved);
      } catch {
        this.error.set('Could not save the vehicle. Check your connection and try again.');
      } finally {
        this.submitting.set(false);
      }
    });
  }
}
