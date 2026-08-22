import { Service } from '@angular/core';

export type OutboxEntryType = 'odometer_entry' | 'repair' | 'maintenance_event';

/**
 * One queued create-operation captured offline. `id` is the IndexedDB
 * auto-increment key and defines replay order. `payload` is the full create
 * payload including the client-generated `uuid` the server dedupes on.
 */
export interface OutboxEntry {
  id: number;
  uuid: string;
  type: OutboxEntryType;
  vehicle_id: number;
  payload: Record<string, unknown>;
  created_at: string;
}

/** The narrow read/delete surface the replay engine needs. */
export interface OutboxStorePort {
  list(): Promise<OutboxEntry[]>;
  remove(ids: number[]): Promise<void>;
}

/** Filters queued entries down to one vehicle's entries of one type. */
export function entriesForVehicle(
  entries: OutboxEntry[],
  vehicleId: number,
  type: OutboxEntryType,
): OutboxEntry[] {
  return entries.filter((e) => e.vehicle_id === vehicleId && e.type === type);
}

const DB_NAME = 'car-log';
const DB_VERSION = 1;
const STORE_NAME = 'outbox';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function transactionComplete(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

/**
 * On-device queue of create-operations captured while the server is
 * unreachable, backed by IndexedDB. Entries are keyed by an auto-increment id
 * so `list()` returns them in capture order — the replay engine sends them in
 * exactly that order.
 */
@Service()
export class Outbox implements OutboxStorePort {
  private db: Promise<IDBDatabase> | null = null;

  private database(): Promise<IDBDatabase> {
    this.db ??= openDb();
    return this.db;
  }

  async enqueue(entry: Omit<OutboxEntry, 'id' | 'created_at'>): Promise<void> {
    const db = await this.database();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).add({ ...entry, created_at: new Date().toISOString() });
    await transactionComplete(tx);
  }

  async list(): Promise<OutboxEntry[]> {
    const db = await this.database();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const entries = await requestToPromise(
      tx.objectStore(STORE_NAME).getAll() as IDBRequest<OutboxEntry[]>,
    );
    return entries;
  }

  async remove(ids: number[]): Promise<void> {
    const db = await this.database();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    for (const id of ids) {
      store.delete(id);
    }
    await transactionComplete(tx);
  }

  async count(): Promise<number> {
    const db = await this.database();
    const tx = db.transaction(STORE_NAME, 'readonly');
    return requestToPromise(tx.objectStore(STORE_NAME).count());
  }
}