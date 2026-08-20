import { Component, inject, signal } from '@angular/core';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';

import { Vehicle, VehiclesApi } from './vehicles-api';
import { VehicleForm } from './vehicle-form';

/**
 * The vehicles screen: lists the owner's vehicles and orchestrates the
 * create/edit form and the delete confirmation. Shown once the app is
 * unlocked; vehicles live server-side, so this screen needs connectivity.
 */
@Component({
  selector: 'app-vehicles',
  imports: [VehicleForm, HlmButtonImports, HlmCardImports],
  templateUrl: './vehicles.html',
})
export class Vehicles {
  private readonly api = inject(VehiclesApi);

  protected readonly vehicles = signal<Vehicle[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  /** undefined = list view, null = adding, Vehicle = editing that vehicle. */
  protected readonly editing = signal<Vehicle | null | undefined>(undefined);
  protected readonly confirmingDeleteId = signal<number | null>(null);
  protected readonly deleting = signal(false);

  constructor() {
    void this.load();
  }

  private async load(): Promise<void> {
    try {
      this.vehicles.set(await this.api.list());
    } catch {
      this.error.set('Could not load your vehicles. Check your connection and reopen the app.');
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

  protected onCancelled(): void {
    this.editing.set(undefined);
  }

  protected async deleteVehicle(vehicle: Vehicle): Promise<void> {
    this.error.set(null);
    this.deleting.set(true);

    try {
      await this.api.delete(vehicle.id);
      this.vehicles.update((vehicles) => vehicles.filter(({ id }) => id !== vehicle.id));
      this.confirmingDeleteId.set(null);
    } catch {
      this.error.set('Could not delete the vehicle. Try again.');
    } finally {
      this.deleting.set(false);
    }
  }
}
