import { OutboxEntry } from './outbox';

/**
 * In-memory stand-in for the IndexedDB-backed {@link Outbox}, used by specs
 * that construct services which touch the store (Sync, Capture, the
 * connectivity interceptor). jsdom has no IndexedDB.
 */
export class FakeOutbox {
  entries: OutboxEntry[] = [];
  removed: number[] = [];
  nextId = 1;

  async enqueue(entry: Omit<OutboxEntry, 'id' | 'created_at'>): Promise<void> {
    this.entries.push({ ...entry, id: this.nextId++, created_at: '2026-08-22T00:00:00Z' });
  }

  async list(): Promise<OutboxEntry[]> {
    return [...this.entries];
  }

  async remove(ids: number[]): Promise<void> {
    this.removed.push(...ids);
    this.entries = this.entries.filter((e) => !ids.includes(e.id));
  }

  async count(): Promise<number> {
    return this.entries.length;
  }
}