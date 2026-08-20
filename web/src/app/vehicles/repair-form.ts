import { Component, inject, input, output, signal } from '@angular/core';
import { FormField, form, required, submit } from '@angular/forms/signals';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmInput } from '@spartan-ng/helm/input';
import { HlmLabel } from '@spartan-ng/helm/label';

import { I18n, msg } from '../i18n/translations';
import { PageHeading } from '../shared/page-heading';
import { VehicleDetailApi } from './vehicle-detail-api';

interface RepairFormModel {
  title: string;
  notes: string;
  cost: string;
  performed_at: string;
  odometer_value: string;
}

@Component({
  selector: 'app-repair-form',
  imports: [FormField, HlmButtonImports, HlmCardImports, HlmInput, HlmLabel, PageHeading],
  templateUrl: './repair-form.html',
})
export class RepairForm {
  private readonly api = inject(VehicleDetailApi);
  protected readonly i18n = inject(I18n);

  readonly vehicleId = input.required<number>();
  readonly saved = output<void>();
  readonly cancelled = output<void>();

  protected readonly model = signal<RepairFormModel>({
    title: '',
    notes: '',
    cost: '',
    performed_at: new Date().toISOString().slice(0, 10),
    odometer_value: '',
  });

  protected readonly repairForm = form(this.model, (path) => {
    required(path.title, { message: msg('repairs.validate.title') });
    required(path.performed_at, { message: msg('repairs.validate.performed_at') });
    required(path.odometer_value, { message: msg('repairs.validate.odometer_value') });
  });

  protected readonly error = signal<string | null>(null);
  protected readonly submitting = signal(false);

  protected save(): void {
    submit(this.repairForm, async () => {
      this.error.set(null);
      this.submitting.set(true);

      try {
        const value = this.model();
        await this.api.createRepair(this.vehicleId(), {
          uuid: crypto.randomUUID(),
          title: value.title,
          notes: value.notes || null,
          cost: value.cost ? Number(value.cost) : null,
          performed_at: value.performed_at,
          odometer_value: Number(value.odometer_value),
        });
        this.saved.emit();
      } catch {
        this.error.set(this.i18n.t()('repairs.error'));
      } finally {
        this.submitting.set(false);
      }
    });
  }
}
