import { Service, inject } from '@angular/core';

import {
  MaintenanceEventPayload,
  OdometerEntryPayload,
  RepairPayload,
  VehicleDetailApi,
} from '../vehicles/vehicle-detail-api';
import { Vehicle, VehiclePayload, VehiclesApi } from '../vehicles/vehicles-api';
import { isConnectionFailure } from './connection-error';
import { Connectivity } from './connectivity';
import { Outbox, OutboxEntry, OutboxEntryType } from './outbox';
import { Sync } from './sync';

export type CaptureResult = { status: 'saved' } | { status: 'queued' };

export type VehicleCaptureResult = { status: 'saved'; vehicle: Vehicle } | { status: 'queued' };

/**
 * Routes entry creation through the outbox when the server cannot be reached:
 * enqueues immediately if connectivity already reports unreachable, and
 * falls back to enqueuing when a direct request fails mid-flight with a
 * connection-level error. A reachable server answering with an HTTP error
 * still surfaces (validation problems are permanent, not offline).
 */
@Service()
export class Capture {
  private readonly api = inject(VehicleDetailApi);
  private readonly vehiclesApi = inject(VehiclesApi);
  private readonly outbox = inject(Outbox);
  private readonly connectivity = inject(Connectivity);
  private readonly sync = inject(Sync);

  async createOdometerEntry(vehicleId: number, payload: OdometerEntryPayload): Promise<CaptureResult> {
    return this.create('odometer_entry', vehicleId, payload, (p) => this.api.createOdometerEntry(vehicleId, p));
  }

  async createRepair(vehicleId: number, payload: RepairPayload): Promise<CaptureResult> {
    return this.create('repair', vehicleId, payload, (p) => this.api.createRepair(vehicleId, p));
  }

  async createMaintenanceEvent(vehicleId: number, payload: MaintenanceEventPayload): Promise<CaptureResult> {
    return this.create('maintenance_event', vehicleId, payload, (p) => this.api.createMaintenanceEvent(vehicleId, p));
  }

  async createVehicle(payload: VehiclePayload): Promise<VehicleCaptureResult> {
    const uuid = crypto.randomUUID();
    if (this.connectivity.unreachable()) {
      await this.enqueue('vehicle', uuid, payload);
      return { status: 'queued' };
    }
    try {
      const vehicle = await this.vehiclesApi.create({ ...payload, uuid });
      return { status: 'saved', vehicle };
    } catch (error) {
      if (isConnectionFailure(error)) {
        await this.enqueue('vehicle', uuid, payload);
        return { status: 'queued' };
      }
      throw error;
    }
  }

  private async create<P>(
    type: Exclude<OutboxEntryType, 'vehicle'>,
    vehicleId: number,
    payload: P,
    send: (payload: P & { uuid: string }) => Promise<unknown>,
  ): Promise<CaptureResult> {
    const uuid = crypto.randomUUID();
    if (this.connectivity.unreachable()) {
      await this.enqueue(type, uuid, payload, vehicleId);
      return { status: 'queued' };
    }
    try {
      await send({ ...payload, uuid });
      return { status: 'saved' };
    } catch (error) {
      if (isConnectionFailure(error)) {
        await this.enqueue(type, uuid, payload, vehicleId);
        return { status: 'queued' };
      }
      throw error;
    }
  }

  private async enqueue(
    type: OutboxEntryType,
    uuid: string,
    payload: unknown,
    vehicleId?: number,
  ): Promise<void> {
    const entry: Omit<OutboxEntry, 'id' | 'created_at'> = {
      type,
      uuid,
      payload: payload as Record<string, unknown>,
      ...(vehicleId !== undefined ? { vehicle_id: vehicleId } : {}),
    };
    await this.outbox.enqueue(entry);
    await this.sync.refreshPending();
  }
}