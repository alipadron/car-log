import { HttpClient } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { isConnectionFailure } from '../offline/connection-error';
import { HomeCache } from '../offline/home-cache';

export type DueStatus = 'overdue' | 'due_soon' | 'ok' | 'never_done';

/**
 * Canonical display order for due statuses (must match backend sort in HomeController).
 * Lower number = displayed first.
 */
export const DUE_STATUS_ORDER: Record<DueStatus, number> = {
  overdue: 0,
  never_done: 1,
  due_soon: 2,
  ok: 3,
};

export interface DueItem {
  schedule_id: number;
  name: string;
  status: DueStatus;
  km_remaining: number | null;
  months_remaining: number | null;
}

export interface RecentActivity {
  type: 'repair' | 'maintenance';
  id: number;
  title: string;
  performed_at: string;
  odometer_value: number;
  cost: string | null;
}

export interface VehicleHome {
  id: number;
  name: string;
  type: 'car' | 'bike';
  make: string;
  model: string;
  year: number;
  current_odometer: number | null;
  due_items: DueItem[];
  recent_activity: RecentActivity[];
}

interface HomeResponse {
  data: VehicleHome[];
}

/**
 * Talks to the home API endpoint. On success the payload is cached on-device;
 * if the server cannot be reached (a connection-level failure with no HTTP
 * response), the last-known snapshot is served so the home screen still renders
 * (stale) data. A reachable-but-erroring server (HTTP error status) surfaces
 * rather than being masked by cached data.
 */
@Service()
export class HomeApi {
  private readonly http = inject(HttpClient);
  private readonly cache = inject(HomeCache);

  async get(): Promise<VehicleHome[]> {
    try {
      const response = await firstValueFrom(this.http.get<HomeResponse>('/api/home'));
      await this.cache.save(response.data);
      return response.data;
    } catch (error) {
      if (isConnectionFailure(error)) {
        const cached = await this.cache.get();
        if (cached !== null) {
          return cached;
        }
      }
      throw error;
    }
  }
}
