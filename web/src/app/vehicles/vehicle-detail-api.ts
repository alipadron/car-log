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

// --- Maintenance schedules ---

export interface MaintenanceSchedule {
  id: number;
  uuid: string;
  vehicle_id: number;
  name: string;
  interval_km: number | null;
  interval_months: number | null;
  created_at: string;
}

export interface MaintenanceSchedulePayload {
  name: string;
  interval_km: number | null;
  interval_months: number | null;
}

interface MaintenanceScheduleResponse {
  data: MaintenanceSchedule;
}

interface MaintenanceSchedulesResponse {
  data: MaintenanceSchedule[];
}

// --- Maintenance events ---

export interface MaintenanceEvent {
  id: number;
  uuid: string;
  vehicle_id: number;
  schedule_id: number | null;
  notes: string | null;
  cost: string | null;
  performed_at: string;
  odometer_value: number;
  created_at: string;
}

export interface MaintenanceEventPayload {
  schedule_id?: number | null;
  notes?: string | null;
  cost?: number | null;
  performed_at: string;
  odometer_value: number;
}

interface MaintenanceEventResponse {
  data: MaintenanceEvent;
}

interface MaintenanceEventsResponse {
  data: MaintenanceEvent[];
}

/**
 * Talks to the odometer-entries, repairs, and maintenance-schedules APIs nested under vehicles.
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

  // --- Maintenance schedules ---

  async listMaintenanceSchedules(vehicleId: number): Promise<MaintenanceSchedule[]> {
    const response = await firstValueFrom(
      this.http.get<MaintenanceSchedulesResponse>(`/api/vehicles/${vehicleId}/maintenance-schedules`),
    );
    return response.data;
  }

  async createMaintenanceSchedule(
    vehicleId: number,
    payload: MaintenanceSchedulePayload & { uuid: string },
  ): Promise<MaintenanceSchedule> {
    const response = await firstValueFrom(
      this.http.post<MaintenanceScheduleResponse>(
        `/api/vehicles/${vehicleId}/maintenance-schedules`,
        payload,
      ),
    );
    return response.data;
  }

  async updateMaintenanceSchedule(
    vehicleId: number,
    scheduleId: number,
    payload: Partial<MaintenanceSchedulePayload>,
  ): Promise<MaintenanceSchedule> {
    const response = await firstValueFrom(
      this.http.put<MaintenanceScheduleResponse>(
        `/api/vehicles/${vehicleId}/maintenance-schedules/${scheduleId}`,
        payload,
      ),
    );
    return response.data;
  }

  async deleteMaintenanceSchedule(vehicleId: number, scheduleId: number): Promise<void> {
    await firstValueFrom(
      this.http.delete(`/api/vehicles/${vehicleId}/maintenance-schedules/${scheduleId}`),
    );
  }

  async seedMaintenanceTemplates(vehicleId: number): Promise<MaintenanceSchedule[]> {
    const response = await firstValueFrom(
      this.http.post<MaintenanceSchedulesResponse>(
        `/api/vehicles/${vehicleId}/maintenance-schedules/seed`,
        {},
      ),
    );
    return response.data;
  }

  // --- Maintenance events ---

  async listMaintenanceEvents(vehicleId: number): Promise<MaintenanceEvent[]> {
    const response = await firstValueFrom(
      this.http.get<MaintenanceEventsResponse>(`/api/vehicles/${vehicleId}/maintenance-events`),
    );
    return response.data;
  }

  async createMaintenanceEvent(
    vehicleId: number,
    payload: MaintenanceEventPayload & { uuid: string },
  ): Promise<MaintenanceEvent> {
    const response = await firstValueFrom(
      this.http.post<MaintenanceEventResponse>(
        `/api/vehicles/${vehicleId}/maintenance-events`,
        payload,
      ),
    );
    return response.data;
  }
}
