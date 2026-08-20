import { Component, inject, input, OnInit, output, signal } from '@angular/core';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';

import { I18n } from '../i18n/translations';
import { VehicleDetailApi, OdometerEntry } from './vehicle-detail-api';

@Component({
  selector: 'app-odometer-entry-list',
  imports: [HlmButtonImports, HlmCardImports],
  templateUrl: './odometer-entry-list.html',
})
export class OdometerEntryList implements OnInit {
  private readonly api = inject(VehicleDetailApi);
  protected readonly i18n = inject(I18n);

  readonly vehicleId = input.required<number>();
  readonly add = output<void>();

  protected readonly entries = signal<OdometerEntry[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  ngOnInit(): void {
    void this.load();
  }

  private async load(): Promise<void> {
    try {
      this.entries.set(await this.api.listOdometerEntries(this.vehicleId()));
    } catch (error) {
      console.error(error);
      this.error.set(this.i18n.t()('odometer.load.error'));
    } finally {
      this.loading.set(false);
    }
  }

  protected formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString();
  }
}
