import { Component, inject, input, OnInit, output, signal } from '@angular/core';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';

import { I18n } from '../i18n/translations';
import { Settings } from '../settings/settings';
import { VehicleDetailApi, MaintenanceEvent } from './vehicle-detail-api';

@Component({
  selector: 'app-maintenance-event-list',
  imports: [HlmButtonImports, HlmCardImports],
  templateUrl: './maintenance-event-list.html',
})
export class MaintenanceEventList implements OnInit {
  private readonly api = inject(VehicleDetailApi);
  protected readonly i18n = inject(I18n);
  protected readonly settings = inject(Settings);

  readonly vehicleId = input.required<number>();
  readonly add = output<void>();

  protected readonly events = signal<MaintenanceEvent[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

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
