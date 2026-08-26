import { Component, computed, effect, inject, output, signal } from '@angular/core';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';

import { I18n } from '../i18n/translations';
import { Sync } from '../offline/sync';
import { PageHeading } from '../shared/page-heading';
import { Vehicle, VehiclePayload, VehiclesApi } from './vehicles-api';
import { VehicleForm } from './vehicle-form';

type PendingVehicleView = VehiclePayload & { uuid: string };

type DisplayVehicle =
  | { kind: 'server'; vehicle: Vehicle }
  | { kind: 'pending'; vehicle: PendingVehicleView };

/**
 * The vehicles screen: lists the owner's vehicles and orchestrates the
 * create/edit form and the delete confirmation. Server vehicles are listed
 * alongside queued offline-created vehicles, which show a pending badge and
 * become real server vehicles once they sync.
 */
@Component({
  selector: 'app-vehicles',
  imports: [VehicleForm, HlmButtonImports, HlmCardImports, PageHeading],
  templateUrl: './vehicles.html',
})
export class Vehicles {
  private readonly api = inject(VehiclesApi);
  private readonly sync = inject(Sync);
  protected readonly i18n = inject(I18n);

  readonly viewVehicle = output<Vehicle>();

  protected readonly vehicles = signal<Vehicle[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  /** undefined = list view, null = adding, Vehicle = editing that vehicle. */
  protected readonly editing = signal<Vehicle | null | undefined>(undefined);
  protected readonly confirmingDeleteId = signal<number | null>(null);
  protected readonly deleting = signal(false);

  protected readonly pendingEntries = computed(() =>
    this.sync.entries().filter((entry) => entry.type === 'vehicle'),
  );

  protected readonly displayed = computed<DisplayVehicle[]>(() => {
    const server: DisplayVehicle[] = this.vehicles().map((vehicle) => ({ kind: 'server', vehicle }));
    const pending: DisplayVehicle[] = this.pendingEntries().map((entry) => ({
      kind: 'pending',
      vehicle: { uuid: entry.uuid, ...(entry.payload as unknown as VehiclePayload) },
    }));
    return [...server, ...pending];
  });

  /** Tracks queued vehicle uuids; when one clears (synced), reload the server list. */
  private readonly syncedVehicleUuids = new Set<string>();
  private readonly reloadAfterSync = effect(() => {
    const uuids = new Set(this.pendingEntries().map((entry) => entry.uuid));
    for (const uuid of [...this.syncedVehicleUuids]) {
      if (!uuids.has(uuid)) {
        this.syncedVehicleUuids.delete(uuid);
        void this.load();
      }
    }
    for (const uuid of uuids) {
      this.syncedVehicleUuids.add(uuid);
    }
  });

  constructor() {
    void this.load();
  }

  private async load(): Promise<void> {
    try {
      this.vehicles.set(await this.api.list());
    } catch {
      this.error.set(this.i18n.t()('vehicles.load.error'));
    } finally {
      this.loading.set(false);
    }
  }

  protected addVehicle(): void {
    this.editing.set(null);
  }

  protected editVehicle(vehicle: Vehicle): void {
    this.editing.set(vehicle);
  }

  protected onSaved(saved: Vehicle): void {
    this.vehicles.update((vehicles) => {
      const index = vehicles.findIndex((vehicle) => vehicle.id === saved.id);
      if (index === -1) {
        return [...vehicles, saved];
      }
      return vehicles.map((vehicle) => (vehicle.id === saved.id ? saved : vehicle));
    });
    this.editing.set(undefined);
  }

  protected onQueued(): void {
    this.editing.set(undefined);
  }

  protected onCancelled(): void {
    this.editing.set(undefined);
  }

  protected onViewVehicle(vehicle: Vehicle): void {
    this.viewVehicle.emit(vehicle);
  }

  protected async deleteVehicle(vehicle: Vehicle): Promise<void> {
    this.error.set(null);
    this.deleting.set(true);

    try {
      await this.api.delete(vehicle.id);
      this.vehicles.update((vehicles) => vehicles.filter(({ id }) => id !== vehicle.id));
      this.confirmingDeleteId.set(null);
    } catch {
      this.error.set(this.i18n.t()('vehicles.delete.error'));
    } finally {
      this.deleting.set(false);
    }
  }
}
