import { Component, inject, input, output, signal } from '@angular/core';
import { FormField, form, required, submit } from '@angular/forms/signals';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmInput } from '@spartan-ng/helm/input';
import { HlmLabel } from '@spartan-ng/helm/label';

import { I18n, msg } from '../i18n/translations';
import { PageHeading } from '../shared/page-heading';
import { VehicleDetailApi } from './vehicle-detail-api';

interface ScheduleFormModel {
  name: string;
  interval_km: string;
  interval_months: string;
}

@Component({
  selector: 'app-maintenance-schedule-form',
  imports: [FormField, HlmButtonImports, HlmCardImports, HlmInput, HlmLabel, PageHeading],
  templateUrl: './maintenance-schedule-form.html',
})
export class MaintenanceScheduleForm {
  private readonly api = inject(VehicleDetailApi);
  protected readonly i18n = inject(I18n);

  readonly vehicleId = input.required<number>();
  readonly saved = output<void>();
  readonly cancelled = output<void>();

  protected readonly model = signal<ScheduleFormModel>({
    name: '',
    interval_km: '',
    interval_months: '',
  });

  protected readonly scheduleForm = form(this.model, (path) => {
    required(path.name, { message: msg('schedules.validate.name') });
  });

  protected readonly error = signal<string | null>(null);
  protected readonly submitting = signal(false);

  protected save(): void {
    submit(this.scheduleForm, async () => {
      this.error.set(null);
      this.submitting.set(true);

      try {
        const value = this.model();
        const intervalKm = value.interval_km ? Number(value.interval_km) : null;
        const intervalMonths = value.interval_months ? Number(value.interval_months) : null;

        if (!intervalKm && !intervalMonths) {
          this.error.set(this.i18n.t()('schedules.validate.interval'));
          this.submitting.set(false);
          return;
        }

        await this.api.createMaintenanceSchedule(this.vehicleId(), {
          uuid: crypto.randomUUID(),
          name: value.name,
          interval_km: intervalKm,
          interval_months: intervalMonths,
        });
        this.saved.emit();
      } catch {
        this.error.set(this.i18n.t()('schedules.error'));
      } finally {
        this.submitting.set(false);
      }
    });
  }
}
