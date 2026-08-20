import { computed, inject, signal } from '@angular/core';
import { Service } from '@angular/core';

import { DistanceUnit, Language, Settings as SettingsData, SettingsApi } from './settings-api';

/**
 * Holds the user's settings as reactive signals. Fetches from the API on
 * construction and exposes computed helpers for the presentation layer.
 */
@Service()
export class Settings {
  private readonly api = inject(SettingsApi);

  private readonly settings = signal<SettingsData | null>(null);
  private readonly loading = signal(true);
  private readonly error = signal<string | null>(null);

  readonly language = computed(() => this.settings()?.language ?? 'en');
  readonly distanceUnit = computed(() => this.settings()?.distance_unit ?? 'km');
  readonly currency = computed(() => this.settings()?.currency ?? 'USD');
  readonly isLoading = this.loading.asReadonly();
  readonly errorMessage = this.error.asReadonly();

  constructor() {
    void this.load();
  }

  private async load(): Promise<void> {
    try {
      this.settings.set(await this.api.get());
    } catch {
      this.error.set('Could not load settings.');
    } finally {
      this.loading.set(false);
    }
  }

  async update(partial: { language?: Language; distance_unit?: DistanceUnit; currency?: string }): Promise<boolean> {
    this.error.set(null);
    try {
      this.settings.set(await this.api.update(partial));
      return true;
    } catch {
      this.error.set('Could not save settings. Check your connection.');
      return false;
    }
  }

  /**
   * Format a distance value according to the current distance unit.
   * Distances are stored in km; this converts at the presentation boundary.
   */
  formatDistance(km: number): string {
    const unit = this.distanceUnit();
    if (unit === 'mi') {
      const miles = km * 0.621371;
      return `${Math.round(miles)} mi`;
    }
    return `${km} km`;
  }

  /**
   * Format a monetary amount with the current currency symbol.
   */
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat(this.language() === 'es' ? 'es-VE' : 'en-US', {
      style: 'currency',
      currency: this.currency(),
    }).format(amount);
  }
}
