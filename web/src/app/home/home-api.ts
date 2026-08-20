import { HttpClient } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

export interface DueItem {
  schedule_id: number;
  name: string;
  status: 'overdue' | 'due_soon' | 'ok' | 'never_done';
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
 * Talks to the home API endpoint.
 */
@Service()
export class HomeApi {
  private readonly http = inject(HttpClient);

  async get(): Promise<VehicleHome[]> {
    const response = await firstValueFrom(this.http.get<HomeResponse>('/api/home'));
    return response.data;
  }
}
