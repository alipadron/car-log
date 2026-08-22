import { Component, computed, inject, input, OnInit, output, signal } from '@angular/core';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';

import { I18n } from '../i18n/translations';
import { entriesForVehicle } from '../offline/outbox';
import { Sync } from '../offline/sync';
import { Settings } from '../settings/settings';
import { VehicleDetailApi, MaintenanceEvent } from './vehicle-detail-api';

interface PendingMaintenanceEvent {
  id: number;
  notes: string | null;
  cost: string | null;
  performed_at: string;
  odometer_value: number;
}

@Component({
  selector: 'app-maintenance-event-list',
  imports: [HlmButtonImports, HlmCardImports],
  templateUrl: './maintenance-event-list.html',
})
export class MaintenanceEventList implements OnInit {
  private readonly api = inject(VehicleDetailApi);
  private readonly sync = inject(Sync);
  protected readonly i18n = inject(I18n);
  protected readonly settings = inject(Settings);

  readonly vehicleId = input.required<number>();
  readonly add = output<void>();

  protected readonly events = signal<MaintenanceEvent[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly pending = computed(() =>
    entriesForVehicle(this.sync.entries(), this.vehicleId(), 'maintenance_event'),
  );
  protected readonly pendingEvents = computed<PendingMaintenanceEvent[]>(() =>
    this.pending().map((e) => ({
      id: e.id,
      notes: (e.payload['notes'] as string | null) ?? null,
      cost: (e.payload['cost'] as string | null) ?? null,
      performed_at: String(e.payload['performed_at'] ?? ''),
      odometer_value: Number(e.payload['odometer_value']),
    })),
  );

  ngOnInit(): void {
    void this.load();
  }

  private async load(): Promise<void> {
    try {
      this.events.set(await this.api.listMaintenanceEvents(this.vehicleId()));
    } catch {
      this.error.set(this.i18n.t()('events.load.error'));
    } finally {
      this.loading.set(false);
    }
  }

  protected formatOdometer(value: number): string {
    return this.settings.formatDistance(value);
  }

  protected formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString();
  }
}