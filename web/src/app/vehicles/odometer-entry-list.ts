import { Component, computed, inject, input, OnInit, output, signal } from '@angular/core';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';

import { I18n } from '../i18n/translations';
import { entriesForVehicle } from '../offline/outbox';
import { Sync } from '../offline/sync';
import { VehicleDetailApi, OdometerEntry } from './vehicle-detail-api';

interface PendingOdometerEntry {
  id: number;
  value: number;
  recorded_at: string;
}

@Component({
  selector: 'app-odometer-entry-list',
  imports: [HlmButtonImports, HlmCardImports],
  templateUrl: './odometer-entry-list.html',
})
export class OdometerEntryList implements OnInit {
  private readonly api = inject(VehicleDetailApi);
  private readonly sync = inject(Sync);
  protected readonly i18n = inject(I18n);

  readonly vehicleId = input.required<number>();
  readonly add = output<void>();

  protected readonly entries = signal<OdometerEntry[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly pending = computed(() =>
    entriesForVehicle(this.sync.entries(), this.vehicleId(), 'odometer_entry'),
  );
  protected readonly pendingEntries = computed<PendingOdometerEntry[]>(() =>
    this.pending().map((e) => ({
      id: e.id,
      value: Number(e.payload['value']),
      recorded_at: String(e.payload['recorded_at'] ?? ''),
    })),
  );

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