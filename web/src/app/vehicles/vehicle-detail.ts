import { Component, inject, input, output, signal } from '@angular/core';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';

import { I18n } from '../i18n/translations';
import { PageHeading } from '../shared/page-heading';
import { Vehicle } from './vehicles-api';
import { OdometerEntryForm } from './odometer-entry-form';
import { OdometerEntryList } from './odometer-entry-list';
import { RepairForm } from './repair-form';
import { RepairList } from './repair-list';
import { MaintenanceScheduleForm } from './maintenance-schedule-form';
import { MaintenanceScheduleList } from './maintenance-schedule-list';
import { MaintenanceEventForm } from './maintenance-event-form';
import { MaintenanceEventList } from './maintenance-event-list';
import { MaintenanceSchedule, VehicleDetailApi } from './vehicle-detail-api';

@Component({
  selector: 'app-vehicle-detail',
  imports: [
    HlmButtonImports, HlmCardImports, PageHeading,
    OdometerEntryForm, OdometerEntryList,
    RepairForm, RepairList,
    MaintenanceScheduleForm, MaintenanceScheduleList,
    MaintenanceEventForm, MaintenanceEventList,
  ],
  templateUrl: './vehicle-detail.html',
})
export class VehicleDetail {
  private readonly api = inject(VehicleDetailApi);
  protected readonly i18n = inject(I18n);

  readonly vehicle = input.required<Vehicle>();
  readonly back = output<void>();

  protected readonly activeTab = signal<'odometer' | 'repairs' | 'schedules' | 'events'>('odometer');
  protected readonly showOdometerForm = signal(false);
  protected readonly showRepairForm = signal(false);
  protected readonly showScheduleForm = signal(false);
  protected readonly showEventForm = signal(false);
  protected readonly editingSchedule = signal<MaintenanceSchedule | null>(null);
  protected readonly schedules = signal<MaintenanceSchedule[]>([]);

  protected goBack(): void {
    this.back.emit();
  }

  protected switchTab(tab: 'odometer' | 'repairs' | 'schedules' | 'events'): void {
    this.activeTab.set(tab);
    this.showOdometerForm.set(false);
    this.showRepairForm.set(false);
    this.showScheduleForm.set(false);
    this.showEventForm.set(false);
    this.editingSchedule.set(null);
  }

  protected startEditSchedule(schedule: MaintenanceSchedule): void {
    this.editingSchedule.set(schedule);
    this.showScheduleForm.set(true);
  }

  protected cancelScheduleForm(): void {
    this.showScheduleForm.set(false);
    this.editingSchedule.set(null);
  }

  protected saveScheduleForm(): void {
    this.showScheduleForm.set(false);
    this.editingSchedule.set(null);
  }

  protected async startAddEvent(): Promise<void> {
    try {
      this.schedules.set(await this.api.listMaintenanceSchedules(this.vehicle().id));
    } catch {
      this.schedules.set([]);
    }
    this.showEventForm.set(true);
  }

  protected cancelEventForm(): void {
    this.showEventForm.set(false);
  }

  protected saveEventForm(): void {
    this.showEventForm.set(false);
  }
}
