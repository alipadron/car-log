import { Component, inject, input, output, signal } from '@angular/core';
import { FormField, form, required, submit } from '@angular/forms/signals';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmInput } from '@spartan-ng/helm/input';
import { HlmLabel } from '@spartan-ng/helm/label';

import { I18n, msg } from '../i18n/translations';
import { Capture } from '../offline/capture';
import { PageHeading } from '../shared/page-heading';

interface OdometerFormModel {
  value: string;
  recorded_at: string;
}

@Component({
  selector: 'app-odometer-entry-form',
  imports: [FormField, HlmButtonImports, HlmCardImports, HlmInput, HlmLabel, PageHeading],
  templateUrl: './odometer-entry-form.html',
})
export class OdometerEntryForm {
  private readonly capture = inject(Capture);
  protected readonly i18n = inject(I18n);

  readonly vehicleId = input.required<number>();
  readonly saved = output<void>();
  readonly cancelled = output<void>();

  protected readonly model = signal<OdometerFormModel>({
    value: '',
    recorded_at: new Date().toISOString().slice(0, 10),
  });

  protected readonly entryForm = form(this.model, (path) => {
    required(path.value, { message: msg('odometer.validate.value') });
    required(path.recorded_at, { message: msg('odometer.validate.recorded_at') });
  });

  protected readonly error = signal<string | null>(null);
  protected readonly submitting = signal(false);

  protected save(): void {
    submit(this.entryForm, async () => {
      this.error.set(null);
      this.submitting.set(true);

      try {
        const value = this.model();
        await this.capture.createOdometerEntry(this.vehicleId(), {
          value: Number(value.value),
          recorded_at: value.recorded_at,
        });
        this.saved.emit();
      } catch {
        this.error.set(this.i18n.t()('odometer.error'));
      } finally {
        this.submitting.set(false);
      }
    });
  }
}
