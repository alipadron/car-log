import { Component, inject, input, OnInit, output, signal } from '@angular/core';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';

import { I18n } from '../i18n/translations';
import { VehicleDetailApi, Repair } from './vehicle-detail-api';

@Component({
  selector: 'app-repair-list',
  imports: [HlmButtonImports, HlmCardImports],
  templateUrl: './repair-list.html',
})
export class RepairList implements OnInit {
  private readonly api = inject(VehicleDetailApi);
  protected readonly i18n = inject(I18n);

  readonly vehicleId = input.required<number>();
  readonly add = output<void>();

  protected readonly repairs = signal<Repair[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

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
