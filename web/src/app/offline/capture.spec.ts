import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { Connectivity } from './connectivity';
import { Capture } from './capture';
import { Outbox } from './outbox';
import { FakeOutbox } from './outbox.fake';
import { Sync } from './sync';
import {
  OdometerEntryPayload,
  RepairPayload,
  VehicleDetailApi,
} from '../vehicles/vehicle-detail-api';
import { Vehicle, VehiclePayload, VehiclesApi } from '../vehicles/vehicles-api';

class FakeApi {
  calls: Array<{ method: string; vehicleId: number; payload: unknown }> = [];
  failure: unknown = null;
  private gate: Promise<void> | null = null;
  private gateRelease: (() => void) | null = null;

  /** Holds the next create call until {@link release} is called. */
  hold(): void {
    this.gate = new Promise((resolve) => {
      this.gateRelease = resolve;
    });
  }

  release(): void {
    this.gateRelease?.();
    this.gate = null;
  }

  private async complete(): Promise<void> {
    if (this.failure !== null) throw this.failure;
    if (this.gate) await this.gate;
  }

  async createOdometerEntry(vehicleId: number, payload: OdometerEntryPayload & { uuid: string }): Promise<unknown> {
    this.calls.push({ method: 'createOdometerEntry', vehicleId, payload });
    await this.complete();
    return {};
  }

  async createRepair(vehicleId: number, payload: RepairPayload & { uuid: string }): Promise<unknown> {
    this.calls.push({ method: 'createRepair', vehicleId, payload });
    await this.complete();
    return {};
  }

  async createMaintenanceEvent(vehicleId: number, payload: RepairPayload & { uuid: string }): Promise<unknown> {
    this.calls.push({ method: 'createMaintenanceEvent', vehicleId, payload });
    await this.complete();
    return {};
  }
}

class FakeVehiclesApi {
  calls: Array<{ method: string; payload: unknown }> = [];
  failure: unknown = null;

  async create(payload: VehiclePayload & { uuid: string }): Promise<Vehicle> {
    this.calls.push({ method: 'create', payload });
    if (this.failure !== null) throw this.failure;
    return {
      id: 1,
      uuid: payload.uuid,
      name: payload.name,
      type: payload.type,
      make: payload.make,
      model: payload.model,
      year: payload.year,
      created_at: '2026-08-22T00:00:00Z',
    };
  }
}

function connectionFailure(): HttpErrorResponse {
  return new HttpErrorResponse({ status: 0, statusText: 'Unknown Error' });
}

function httpError(): HttpErrorResponse {
  return new HttpErrorResponse({ status: 422, statusText: 'Unprocessable Entity' });
}

function repair(title: string): RepairPayload {
  return {
    title,
    notes: null,
    cost: null,
    performed_at: '2026-08-22T00:00:00Z',
    odometer_value: 120000,
  };
}

function vehicle(name: string): VehiclePayload {
  return { name, type: 'car', make: 'Toyota', model: 'Corolla', year: 2015 };
}

describe('Capture', () => {
  let outbox: FakeOutbox;
  let api: FakeApi;
  let vehiclesApi: FakeVehiclesApi;
  let connectivity: Connectivity;
  let sync: Sync;
  let capture: Capture;

  beforeEach(() => {
    outbox = new FakeOutbox();
    api = new FakeApi();
    vehiclesApi = new FakeVehiclesApi();
    TestBed.configureTestingModule({});
    TestBed.overrideProvider(Outbox, { useValue: outbox });
    TestBed.overrideProvider(VehicleDetailApi, { useValue: api });
    TestBed.overrideProvider(VehiclesApi, { useValue: vehiclesApi });
    connectivity = TestBed.inject(Connectivity);
    sync = TestBed.inject(Sync);
    capture = TestBed.inject(Capture);
  });

  it('saves through the API when the server is reachable', async () => {
    const result = await capture.createRepair(7, repair('Oil change'));

    expect(result).toEqual({ status: 'saved' });
    expect(api.calls).toHaveLength(1);
    expect(api.calls[0].vehicleId).toBe(7);
    expect((api.calls[0].payload as { title: string }).title).toBe('Oil change');
    expect((api.calls[0].payload as { uuid: string }).uuid).toMatch(/^[0-9a-f-]{36}$/);
    expect(outbox.entries).toEqual([]);
    expect(sync.pending()).toBe(0);
  });

  it('queues an entry and reports it pending when the server is unreachable', async () => {
    connectivity.reportServerFailure();

    const result = await capture.createRepair(7, repair('Oil change'));

    expect(result).toEqual({ status: 'queued' });
    expect(api.calls).toHaveLength(0);
    expect(outbox.entries).toHaveLength(1);
    expect(outbox.entries[0]).toMatchObject({ type: 'repair', vehicle_id: 7, payload: repair('Oil change') });
    expect(outbox.entries[0].uuid).toMatch(/^[0-9a-f-]{36}$/);
    expect(sync.pending()).toBe(1);
  });

  it('queues a repair whose request fails to reach the server mid-flight', async () => {
    api.failure = connectionFailure();

    const result = await capture.createRepair(7, repair('Oil change'));

    expect(result).toEqual({ status: 'queued' });
    expect(outbox.entries).toHaveLength(1);
  });

  it('does not queue when the server answers with an HTTP error', async () => {
    api.failure = httpError();

    await expect(capture.createRepair(7, repair('Oil change'))).rejects.toThrow();

    expect(outbox.entries).toEqual([]);
  });

  it('maps odometer and maintenance-event creates to the right outbox type', async () => {
    connectivity.reportServerFailure();

    await capture.createOdometerEntry(3, { value: 120000, recorded_at: '2026-08-22T00:00:00Z' });
    await capture.createMaintenanceEvent(3, { performed_at: '2026-08-22T00:00:00Z', odometer_value: 120000 });

    expect(outbox.entries.map((e) => e.type)).toEqual(['odometer_entry', 'maintenance_event']);
    expect(sync.pending()).toBe(2);
  });

  it('recovers to direct saves once the server is reachable again', async () => {
    connectivity.reportServerFailure();
    await capture.createRepair(7, repair('Offline repair'));
    expect(outbox.entries).toHaveLength(1);

    connectivity.reportServerSuccess();
    const result = await capture.createRepair(7, repair('Online repair'));

    expect(result).toEqual({ status: 'saved' });
    expect(api.calls).toHaveLength(1);
    expect(outbox.entries).toHaveLength(1);
  });

  it('does not double-send when flushes overlap', async () => {
    connectivity.reportServerFailure();
    await capture.createRepair(7, repair('Offline repair'));
    expect(sync.pending()).toBe(1);

    api.hold();
    const first = sync.attemptFlush();
    const second = sync.attemptFlush();
    api.release();
    await Promise.all([first, second]);

    expect(api.calls).toHaveLength(1);
    expect(sync.pending()).toBe(0);
  });

  it('saves a vehicle through the API when the server is reachable', async () => {
    const result = await capture.createVehicle(vehicle('Daily driver'));

    expect(result.status).toBe('saved');
    expect((result as { vehicle: Vehicle }).vehicle.name).toBe('Daily driver');
    expect(vehiclesApi.calls).toHaveLength(1);
    expect((vehiclesApi.calls[0].payload as { uuid: string }).uuid).toMatch(/^[0-9a-f-]{36}$/);
    expect(outbox.entries).toEqual([]);
  });

  it('queues a vehicle with no vehicle_id when the server is unreachable', async () => {
    connectivity.reportServerFailure();

    const result = await capture.createVehicle(vehicle('Daily driver'));

    expect(result).toEqual({ status: 'queued' });
    expect(vehiclesApi.calls).toHaveLength(0);
    expect(outbox.entries).toHaveLength(1);
    expect(outbox.entries[0]).toMatchObject({ type: 'vehicle', payload: vehicle('Daily driver') });
    expect(outbox.entries[0].uuid).toMatch(/^[0-9a-f-]{36}$/);
    expect(outbox.entries[0].vehicle_id).toBeUndefined();
    expect(sync.pending()).toBe(1);
  });

  it('queues a vehicle whose create fails to reach the server mid-flight', async () => {
    vehiclesApi.failure = connectionFailure();

    const result = await capture.createVehicle(vehicle('Daily driver'));

    expect(result).toEqual({ status: 'queued' });
    expect(outbox.entries).toHaveLength(1);
  });

  it('does not queue a vehicle when the server answers with an HTTP error', async () => {
    vehiclesApi.failure = httpError();

    await expect(capture.createVehicle(vehicle('Daily driver'))).rejects.toThrow();

    expect(outbox.entries).toEqual([]);
  });
});