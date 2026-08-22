import { Service, inject } from '@angular/core';

import {
  MaintenanceEventPayload,
  OdometerEntryPayload,
  RepairPayload,
  VehicleDetailApi,
} from '../vehicles/vehicle-detail-api';
import { isConnectionFailure } from './connection-error';
import { Connectivity } from './connectivity';
import { Outbox, OutboxEntryType } from './outbox';
import { Sync } from './sync';

export type CaptureResult = { status: 'saved' } | { status: 'queued' };

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

  private async create<P>(
    type: OutboxEntryType,
    vehicleId: number,
    payload: P,
    send: (payload: P & { uuid: string }) => Promise<unknown>,
  ): Promise<CaptureResult> {
    const uuid = crypto.randomUUID();
    if (this.connectivity.unreachable()) {
      await this.enqueue(type, vehicleId, uuid, payload);
      return { status: 'queued' };
    }
    try {
      await send({ ...payload, uuid });
      return { status: 'saved' };
    } catch (error) {
      if (isConnectionFailure(error)) {
        await this.enqueue(type, vehicleId, uuid, payload);
        return { status: 'queued' };
      }
      throw error;
    }
  }

  private async enqueue(type: OutboxEntryType, vehicleId: number, uuid: string, payload: unknown): Promise<void> {
    await this.outbox.enqueue({ type, vehicle_id: vehicleId, uuid, payload: payload as Record<string, unknown> });
    await this.sync.refreshPending();
  }
}