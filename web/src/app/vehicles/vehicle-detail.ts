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

@Component({
  selector: 'app-vehicle-detail',
  imports: [HlmButtonImports, HlmCardImports, PageHeading, OdometerEntryForm, OdometerEntryList, RepairForm, RepairList],
  templateUrl: './vehicle-detail.html',
})
export class VehicleDetail {
  protected readonly i18n = inject(I18n);

  readonly vehicle = input.required<Vehicle>();
  readonly back = output<void>();

  protected readonly activeTab = signal<'odometer' | 'repairs'>('odometer');
  protected readonly showOdometerForm = signal(false);
  protected readonly showRepairForm = signal(false);

  protected goBack(): void {
    this.back.emit();
  }

  protected switchTab(tab: 'odometer' | 'repairs'): void {
    this.activeTab.set(tab);
    this.showOdometerForm.set(false);
    this.showRepairForm.set(false);
  }
}
