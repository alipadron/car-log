import { describe, expect, it } from 'vitest';

import { OutboxEntry } from './outbox';
import { FakeOutbox } from './outbox.fake';
import { ReplayEngine } from './replay';

function entry(id: number, overrides: Partial<OutboxEntry> = {}): OutboxEntry {
  return {
    id,
    uuid: `00000000-0000-4000-8000-${String(id).padStart(12, '0')}`,
    type: 'repair',
    vehicle_id: 1,
    payload: { title: `Repair ${id}` },
    created_at: '2026-08-22T00:00:00Z',
    ...overrides,
  };
}

describe('ReplayEngine', () => {
  it('replays queued entries in order and clears them from the outbox', async () => {
    const outbox = new FakeOutbox();
    outbox.entries = [entry(1), entry(2)];
    const sent: OutboxEntry[] = [];
    const engine = new ReplayEngine({ outbox, send: async (e) => { sent.push(e); } });

    const flushed = await engine.flush();

    expect(flushed).toBe(2);
    expect(sent.map((e) => e.id)).toEqual([1, 2]);
    expect(outbox.entries).toEqual([]);
    expect(outbox.removed).toEqual([1, 2]);
  });

  it('stops on failure and retries the remaining entries on the next flush', async () => {
    const outbox = new FakeOutbox();
    outbox.entries = [entry(1), entry(2), entry(3)];
    const attempts = new Map<number, number>();
    const sent: OutboxEntry[] = [];
    const engine = new ReplayEngine({
      outbox,
      send: async (e) => {
        const n = (attempts.get(e.id) ?? 0) + 1;
        attempts.set(e.id, n);
        if (e.id === 1 && n === 1) {
          throw new Error('server unreachable');
        }
        sent.push(e);
      },
    });

    const firstFlush = await engine.flush();

    expect(firstFlush).toBe(0);
    expect(sent).toEqual([]);
    expect(outbox.entries).toHaveLength(3);

    const secondFlush = await engine.flush();

    expect(secondFlush).toBe(3);
    expect(sent.map((e) => e.id)).toEqual([1, 2, 3]);
    expect(outbox.entries).toEqual([]);
    expect(outbox.removed).toEqual([1, 2, 3]);
  });

  it('does not re-send an entry once it has been accepted', async () => {
    const outbox = new FakeOutbox();
    outbox.entries = [entry(1)];
    const sent: OutboxEntry[] = [];
    const engine = new ReplayEngine({ outbox, send: async (e) => { sent.push(e); } });

    await engine.flush();
    await engine.flush();

    expect(sent).toHaveLength(1);
    expect(outbox.entries).toEqual([]);
  });

  it('removes an entry already accepted by the server (idempotent replay) after one send', async () => {
    const outbox = new FakeOutbox();
    outbox.entries = [entry(1)];
    const sent: OutboxEntry[] = [];
    const engine = new ReplayEngine({ outbox, send: async (e) => { sent.push(e); } });

    await engine.flush();

    expect(sent).toHaveLength(1);
    expect(outbox.removed).toEqual([1]);
    expect(outbox.entries).toEqual([]);
  });
});