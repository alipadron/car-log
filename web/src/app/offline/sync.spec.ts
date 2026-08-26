import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { Vehicle, VehiclePayload, VehiclesApi } from '../vehicles/vehicles-api';
import {
  MaintenanceEventPayload,
  OdometerEntryPayload,
  RepairPayload,
  VehicleDetailApi,
} from '../vehicles/vehicle-detail-api';
import { Outbox, OutboxEntry } from './outbox';
import { FakeOutbox } from './outbox.fake';
import { Sync } from './sync';

class FakeDetailApi {
  repairs: Array<{ vehicleId: number; payload: RepairPayload & { uuid: string } }> = [];
  failure: unknown = null;

  async createRepair(vehicleId: number, payload: RepairPayload & { uuid: string }): Promise<unknown> {
    this.repairs.push({ vehicleId, payload });
    if (this.failure !== null) throw this.failure;
    return {};
  }

  async createOdometerEntry(vehicleId: number, payload: OdometerEntryPayload & { uuid: string }): Promise<unknown> {
    if (this.failure !== null) throw this.failure;
    return {};
  }

  async createMaintenanceEvent(vehicleId: number, payload: MaintenanceEventPayload & { uuid: string }): Promise<unknown> {
    if (this.failure !== null) throw this.failure;
    return {};
  }
}

class FakeVehiclesApi {
  creates: Array<{ payload: VehiclePayload & { uuid: string } }> = [];
  failure: unknown = null;

  async create(payload: VehiclePayload & { uuid: string }): Promise<Vehicle> {
    this.creates.push({ payload });
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

function entry(
  id: number,
  type: OutboxEntry['type'],
  payload: Record<string, unknown>,
  overrides: Partial<OutboxEntry> = {},
): OutboxEntry {
  return {
    id,
    uuid: `00000000-0000-4000-8000-${String(id).padStart(12, '0')}`,
    type,
    payload,
    created_at: '2026-08-22T00:00:00Z',
    ...overrides,
  };
}

const vehiclePayload = {
  name: 'Daily driver',
  type: 'car',
  make: 'Toyota',
  model: 'Corolla',
  year: 2015,
};

describe('Sync', () => {
  let outbox: FakeOutbox;
  let detailApi: FakeDetailApi;
  let vehiclesApi: FakeVehiclesApi;

  beforeEach(() => {
    outbox = new FakeOutbox();
    detailApi = new FakeDetailApi();
    vehiclesApi = new FakeVehiclesApi();
    TestBed.configureTestingModule({});
    TestBed.overrideProvider(Outbox, { useValue: outbox });
    TestBed.overrideProvider(VehicleDetailApi, { useValue: detailApi });
    TestBed.overrideProvider(VehiclesApi, { useValue: vehiclesApi });
  });

  it('replays a queued vehicle create through the vehicles API, with its client uuid, and clears it', async () => {
    outbox.entries = [entry(1, 'vehicle', vehiclePayload)];

    await TestBed.inject(Sync).attemptFlush();

    expect(vehiclesApi.creates).toHaveLength(1);
    expect(vehiclesApi.creates[0].payload).toEqual({
      ...vehiclePayload,
      uuid: '00000000-0000-4000-8000-000000000001',
    });
    expect(outbox.entries).toEqual([]);
    expect(TestBed.inject(Sync).pending()).toBe(0);
  });

  it('restores the client uuid into a replayed dependent payload', async () => {
    outbox.entries = [
      entry(7, 'repair', {
        title: 'Oil change',
        notes: null,
        cost: null,
        performed_at: '2026-08-22T00:00:00Z',
        odometer_value: 120000,
      }, { vehicle_id: 7 }),
    ];

    await TestBed.inject(Sync).attemptFlush();

    expect(detailApi.repairs).toHaveLength(1);
    expect(detailApi.repairs[0].vehicleId).toBe(7);
    expect(detailApi.repairs[0].payload).toEqual({
      title: 'Oil change',
      notes: null,
      cost: null,
      performed_at: '2026-08-22T00:00:00Z',
      odometer_value: 120000,
      uuid: '00000000-0000-4000-8000-000000000007',
    });
  });

  it('keeps the vehicle entry and stops the flush when the create fails', async () => {
    vehiclesApi.failure = new Error('server unreachable');
    outbox.entries = [entry(1, 'vehicle', vehiclePayload)];
    const sync = TestBed.inject(Sync);

    await sync.attemptFlush();

    expect(outbox.entries).toHaveLength(1);
    expect(sync.pending()).toBe(1);
  });
});