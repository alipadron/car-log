import { Component, computed, inject, input, OnInit, output, signal } from '@angular/core';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';

import { I18n } from '../i18n/translations';
import { entriesForVehicle } from '../offline/outbox';
import { Sync } from '../offline/sync';
import { VehicleDetailApi, Repair } from './vehicle-detail-api';

interface PendingRepair {
  id: number;
  title: string;
  notes: string | null;
  cost: string | null;
  performed_at: string;
  odometer_value: number;
}

@Component({
  selector: 'app-repair-list',
  imports: [HlmButtonImports, HlmCardImports],
  templateUrl: './repair-list.html',
})
export class RepairList implements OnInit {
  private readonly api = inject(VehicleDetailApi);
  private readonly sync = inject(Sync);
  protected readonly i18n = inject(I18n);

  readonly vehicleId = input.required<number>();
  readonly add = output<void>();

  protected readonly repairs = signal<Repair[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly pending = computed(() => entriesForVehicle(this.sync.entries(), this.vehicleId(), 'repair'));
  protected readonly pendingRepairs = computed<PendingRepair[]>(() =>
    this.pending().map((e) => ({
      id: e.id,
      title: String(e.payload['title'] ?? ''),
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
      this.repairs.set(await this.api.listRepairs(this.vehicleId()));
    } catch {
      this.error.set(this.i18n.t()('repairs.load.error'));
    } finally {
      this.loading.set(false);
    }
  }

  protected formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString();
  }
}