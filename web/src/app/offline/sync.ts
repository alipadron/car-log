import { Service, inject, signal } from '@angular/core';

import {
  MaintenanceEventPayload,
  OdometerEntryPayload,
  RepairPayload,
  VehicleDetailApi,
} from '../vehicles/vehicle-detail-api';
import { Outbox, OutboxEntry } from './outbox';
import { ReplayEngine } from './replay';

/**
 * Owns the outbox replay lifecycle and the pending state the UI reads. The
 * connectivity interceptor calls {@link attemptFlush} after any successful
 * response, so queued entries land as soon as the server answers again.
 */
@Service()
export class Sync {
  private readonly outbox = inject(Outbox);
  private readonly api = inject(VehicleDetailApi);
  private readonly engine = new ReplayEngine({
    outbox: this.outbox,
    send: (entry) => this.sendEntry(entry),
  });
  private flushing = false;

  /** Number of entries queued on-device awaiting sync. */
  readonly pending = signal(0);

  /** The full queued set, mirrored from the outbox so the UI reacts to syncs. */
  readonly entries = signal<OutboxEntry[]>([]);

  constructor() {
    void this.refreshPending();
  }

  /**
   * Replays queued entries. No-op when nothing is queued; guarded so
   * re-entrant calls (every successful response triggers one, including the
   * responses produced by the flush itself) don't run concurrent flushes.
   */
  async attemptFlush(): Promise<void> {
    if (this.flushing) return;
    this.flushing = true;
    try {
      if ((await this.outbox.count()) === 0) return;
      await this.engine.flush();
    } finally {
      this.flushing = false;
      await this.refreshPending();
    }
  }

  async refreshPending(): Promise<void> {
    const entries = await this.outbox.list();
    this.entries.set(entries);
    this.pending.set(entries.length);
  }

  private async sendEntry(entry: OutboxEntry): Promise<void> {
    switch (entry.type) {
      case 'odometer_entry':
        await this.api.createOdometerEntry(
          entry.vehicle_id,
          entry.payload as unknown as OdometerEntryPayload & { uuid: string },
        );
        return;
      case 'repair':
        await this.api.createRepair(
          entry.vehicle_id,
          entry.payload as unknown as RepairPayload & { uuid: string },
        );
        return;
      case 'maintenance_event':
        await this.api.createMaintenanceEvent(
          entry.vehicle_id,
          entry.payload as unknown as MaintenanceEventPayload & { uuid: string },
        );
        return;
    }
  }
}