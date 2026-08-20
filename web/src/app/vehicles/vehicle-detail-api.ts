import { HttpClient } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

// --- Odometer entries ---

export interface OdometerEntry {
  id: number;
  uuid: string;
  vehicle_id: number;
  value: number;
  recorded_at: string;
  created_at: string;
}

export interface OdometerEntryPayload {
  value: number;
  recorded_at: string;
}

interface OdometerEntryResponse {
  data: OdometerEntry;
}

interface OdometerEntriesResponse {
  data: OdometerEntry[];
}

// --- Repairs ---

export interface Repair {
  id: number;
  uuid: string;
  vehicle_id: number;
  title: string;
  notes: string | null;
  cost: string | null;
  performed_at: string;
  odometer_value: number;
  created_at: string;
}

export interface RepairPayload {
  title: string;
  notes: string | null;
  cost: number | null;
  performed_at: string;
  odometer_value: number;
}

interface RepairResponse {
  data: Repair;
}

interface RepairsResponse {
  data: Repair[];
}

/**
 * Talks to the odometer-entries and repairs APIs nested under vehicles.
 * Creates carry a client-generated UUID for idempotent outbox replay.
 */
@Service()
export class VehicleDetailApi {
  private readonly http = inject(HttpClient);

  // --- Odometer entries ---

  async listOdometerEntries(vehicleId: number): Promise<OdometerEntry[]> {
    const response = await firstValueFrom(
      this.http.get<OdometerEntriesResponse>(`/api/vehicles/${vehicleId}/odometer-entries`),
    );
    return response.data;
  }

  async createOdometerEntry(
    vehicleId: number,
    payload: OdometerEntryPayload & { uuid: string },
  ): Promise<OdometerEntry> {
    const response = await firstValueFrom(
      this.http.post<OdometerEntryResponse>(
        `/api/vehicles/${vehicleId}/odometer-entries`,
        payload,
      ),
    );
    return response.data;
  }

  // --- Repairs ---

  async listRepairs(vehicleId: number): Promise<Repair[]> {
    const response = await firstValueFrom(
      this.http.get<RepairsResponse>(`/api/vehicles/${vehicleId}/repairs`),
    );
    return response.data;
  }

  async createRepair(
    vehicleId: number,
    payload: RepairPayload & { uuid: string },
  ): Promise<Repair> {
    const response = await firstValueFrom(
      this.http.post<RepairResponse>(`/api/vehicles/${vehicleId}/repairs`, payload),
    );
    return response.data;
  }
}
