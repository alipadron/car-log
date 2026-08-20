import { Component, inject, input, OnInit, output, signal } from '@angular/core';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';

import { I18n } from '../i18n/translations';
import { VehicleDetailApi, MaintenanceSchedule } from './vehicle-detail-api';

@Component({
  selector: 'app-maintenance-schedule-list',
  imports: [HlmButtonImports, HlmCardImports],
  templateUrl: './maintenance-schedule-list.html',
})
export class MaintenanceScheduleList implements OnInit {
  private readonly api = inject(VehicleDetailApi);
  protected readonly i18n = inject(I18n);

  readonly vehicleId = input.required<number>();
  readonly add = output<void>();
  readonly edit = output<MaintenanceSchedule>();

  protected readonly schedules = signal<MaintenanceSchedule[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly seeding = signal(false);

  ngOnInit(): void {
    void this.load();
  }

  private async load(): Promise<void> {
    try {
      this.schedules.set(await this.api.listMaintenanceSchedules(this.vehicleId()));
    } catch {
      this.error.set(this.i18n.t()('schedules.load.error'));
    } finally {
      this.loading.set(false);
    }
  }

  protected async seedTemplates(): Promise<void> {
    this.seeding.set(true);
    this.error.set(null);

    try {
      this.schedules.set(await this.api.seedMaintenanceTemplates(this.vehicleId()));
    } catch {
      this.error.set(this.i18n.t()('schedules.seed.error'));
    } finally {
      this.seeding.set(false);
    }
  }

  protected async deleteSchedule(schedule: MaintenanceSchedule): Promise<void> {
    try {
      await this.api.deleteMaintenanceSchedule(this.vehicleId(), schedule.id);
      this.schedules.update((list) => list.filter((s) => s.id !== schedule.id));
    } catch {
      this.error.set(this.i18n.t()('schedules.delete.error'));
    }
  }

  protected formatInterval(schedule: MaintenanceSchedule): string {
    const parts: string[] = [];
    if (schedule.interval_km) parts.push(`${schedule.interval_km.toLocaleString()} km`);
    if (schedule.interval_months) parts.push(`${schedule.interval_months} mo`);
    return parts.join(' · ');
  }
}
