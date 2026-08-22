import { OutboxEntry, OutboxStorePort } from './outbox';

export interface ReplayDeps {
  outbox: OutboxStorePort;
  send(entry: OutboxEntry): Promise<void>;
}

/**
 * Replays queued outbox entries through a sender in capture order. Each entry
 * is removed only after its send resolves; a failed send stops the flush and
 * leaves every remaining entry (including the failed one) in the outbox, so
 * the next flush retries from the same point. Sends are idempotent: the server
 * accepts a repeated client uuid with a 200, so replaying an already-accepted
 * entry clears it without duplicating it.
 */
export class ReplayEngine {
  constructor(private readonly deps: ReplayDeps) {}

  /** Replays as many queued entries as it can; returns how many were cleared. */
  async flush(): Promise<number> {
    const entries = await this.deps.outbox.list();
    let cleared = 0;
    for (const entry of entries) {
      try {
        await this.deps.send(entry);
      } catch {
        break;
      }
      await this.deps.outbox.remove([entry.id]);
      cleared += 1;
    }
    return cleared;
  }
}