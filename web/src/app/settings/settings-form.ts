import { Component, inject, signal } from '@angular/core';
import { FormField, form, pattern, required, submit, validate } from '@angular/forms/signals';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmInput } from '@spartan-ng/helm/input';
import { HlmLabel } from '@spartan-ng/helm/label';

import { I18n } from '../i18n/translations';
import { PageHeading } from '../shared/page-heading';
import { DistanceUnit, Language } from './settings-api';
import { Settings } from './settings';

interface SettingsFormModel {
  language: Language;
  distance_unit: DistanceUnit;
  currency: string;
}

/**
 * Settings form: lets the owner configure language, distance unit, and currency.
 */
@Component({
  selector: 'app-settings-form',
  imports: [FormField, HlmButtonImports, HlmCardImports, HlmInput, HlmLabel, PageHeading],
  templateUrl: './settings-form.html',
})
export class SettingsForm {
  private readonly settings = inject(Settings);
  protected readonly i18n = inject(I18n);

  protected readonly error = signal<string | null>(null);
  protected readonly submitting = signal(false);
  protected readonly saved = signal(false);

  protected readonly model = signal<SettingsFormModel>({
    language: this.settings.language(),
    distance_unit: this.settings.distanceUnit(),
    currency: this.settings.currency(),
  });

  protected readonly settingsForm = form(this.model, (path) => {
    required(path.language);
    required(path.distance_unit);
    required(path.currency, { message: 'Enter a currency code.' });
    pattern(path.currency, /^[A-Z]{3}$/, { message: 'Enter a 3-letter currency code (e.g. USD, EUR).' });
    validate(path.currency, (ctx) => {
      const raw = ctx.value();
      if (raw === '') {
        return null;
      }
      return raw.length <= 10 ? null : { kind: 'currencyLength', message: 'Currency code is too long.' };
    });
  });

  protected save(): void {
    submit(this.settingsForm, async () => {
      this.error.set(null);
      this.saved.set(false);
      this.submitting.set(true);

      try {
        const value = this.model();
        const success = await this.settings.update({
          language: value.language,
          distance_unit: value.distance_unit,
          currency: value.currency.toUpperCase(),
        });

        if (success) {
          this.saved.set(true);
        } else {
          this.error.set(this.settings.errorMessage() ?? 'Could not save settings.');
        }
      } catch {
        this.error.set('Could not save settings. Check your connection and try again.');
      } finally {
        this.submitting.set(false);
      }
    });
  }
}
