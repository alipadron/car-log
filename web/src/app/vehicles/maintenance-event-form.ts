import { Component, inject, input, output, signal } from '@angular/core';
import { FormField, form, required, submit } from '@angular/forms/signals';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmInput } from '@spartan-ng/helm/input';
import { HlmLabel } from '@spartan-ng/helm/label';

import { I18n, msg } from '../i18n/translations';
import { PageHeading } from '../shared/page-heading';
import { MaintenanceSchedule, VehicleDetailApi } from './vehicle-detail-api';

interface EventFormModel {
  schedule_id: string;
  notes: string;
  cost: string;
  performed_at: string;
  odometer_value: string;
}

@Component({
  selector: 'app-maintenance-event-form',
  imports: [FormField, HlmButtonImports, HlmCardImports, HlmInput, HlmLabel, PageHeading],
  templateUrl: './maintenance-event-form.html',
})
export class MaintenanceEventForm {
  private readonly api = inject(VehicleDetailApi);
  protected readonly i18n = inject(I18n);

  readonly vehicleId = input.required<number>();
  readonly schedules = input<MaintenanceSchedule[]>([]);
  readonly saved = output<void>();
  readonly cancelled = output<void>();

  protected readonly model = signal<EventFormModel>({
    schedule_id: '',
    notes: '',
    cost: '',
    performed_at: new Date().toISOString().slice(0, 10),
    odometer_value: '',
  });

  protected readonly eventForm = form(this.model, (path) => {
    required(path.performed_at, { message: msg('events.validate.performed_at') });
    required(path.odometer_value, { message: msg('events.validate.odometer_value') });
  });

  protected readonly error = signal<string | null>(null);
  protected readonly submitting = signal(false);

  protected save(): void {
    submit(this.eventForm, async () => {
      this.error.set(null);
      this.submitting.set(true);

      try {
        const value = this.model();
        await this.api.createMaintenanceEvent(this.vehicleId(), {
          uuid: crypto.randomUUID(),
          schedule_id: value.schedule_id ? Number(value.schedule_id) : null,
          notes: value.notes || null,
          cost: value.cost ? Number(value.cost) : null,
          performed_at: value.performed_at,
          odometer_value: Number(value.odometer_value),
        });
        this.saved.emit();
      } catch {
        this.error.set(this.i18n.t()('events.error'));
      } finally {
        this.submitting.set(false);
      }
    });
  }
}
