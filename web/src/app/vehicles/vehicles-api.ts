import { HttpClient } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

export type VehicleType = 'car' | 'bike';

export interface Vehicle {
  id: number;
  uuid: string;
  name: string;
  type: VehicleType;
  make: string;
  model: string;
  year: number;
  created_at: string;
}

export interface VehiclePayload {
  name: string;
  type: VehicleType;
  make: string;
  model: string;
  year: number;
}

interface VehicleResponse {
  data: Vehicle;
}

interface VehiclesResponse {
  data: Vehicle[];
}

/**
 * Talks to the vehicles API. Creates carry a client-generated UUID so the
 * server can dedupe replays (see ADR 0001's idempotency requirement).
 */
@Service()
export class VehiclesApi {
  private readonly http = inject(HttpClient);

  async list(): Promise<Vehicle[]> {
    const response = await firstValueFrom(this.http.get<VehiclesResponse>('/api/vehicles'));
    return response.data;
  }

  async create(payload: VehiclePayload & { uuid: string }): Promise<Vehicle> {
    const response = await firstValueFrom(
      this.http.post<VehicleResponse>('/api/vehicles', payload),
    );
    return response.data;
  }

  async update(id: number, payload: VehiclePayload): Promise<Vehicle> {
    const response = await firstValueFrom(
      this.http.put<VehicleResponse>(`/api/vehicles/${id}`, payload),
    );
    return response.data;
  }

  async delete(id: number): Promise<void> {
    await firstValueFrom(this.http.delete(`/api/vehicles/${id}`));
  }
}
