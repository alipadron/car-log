import { Component, inject, OnInit, signal } from '@angular/core';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';

import { I18n } from '../i18n/translations';
import { PageHeading } from '../shared/page-heading';
import { Settings } from '../settings/settings';
import { HomeApi, VehicleHome, DueItem, DueStatus, DUE_STATUS_ORDER, RecentActivity } from './home-api';

@Component({
  selector: 'app-home',
  imports: [HlmButtonImports, HlmCardImports, PageHeading],
  templateUrl: './home.html',
})
export class Home implements OnInit {
  private readonly api = inject(HomeApi);
  protected readonly i18n = inject(I18n);
  protected readonly settings = inject(Settings);

  protected readonly vehicles = signal<VehicleHome[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  ngOnInit(): void {
    void this.load();
  }

  protected async load(): Promise<void> {
    try {
      this.vehicles.set(await this.api.get());
    } catch {
      this.error.set(this.i18n.t()('home.load.error'));
    } finally {
      this.loading.set(false);
    }
  }

  protected formatOdometer(value: number | null): string {
    if (value === null) return '—';
    return this.settings.formatDistance(value);
  }

  protected statusLabel(status: string): string {
    return this.i18n.t()(`home.status.${status}`);
  }

  protected statusClass(status: DueStatus): string {
    switch (status) {
      case 'overdue': return 'text-destructive font-semibold';
      case 'due_soon': return 'text-yellow-600 dark:text-yellow-400';
      case 'never_done': return 'text-orange-500 dark:text-orange-400';
      default: return 'text-muted-foreground';
    }
  }

  protected formatDueRemaining(item: DueItem): string {
    const parts: string[] = [];
    if (item.km_remaining !== null) {
      parts.push(this.settings.formatDistance(item.km_remaining));
    }
    if (item.months_remaining !== null) {
      parts.push(`${item.months_remaining} mo`);
    }
    return parts.length > 0 ? parts.join(' · ') : '';
  }

  protected formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString();
  }
}
