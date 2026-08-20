import { HttpClient } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

export type Language = 'en' | 'es';
export type DistanceUnit = 'km' | 'mi';

export interface Settings {
  id: number;
  language: Language;
  distance_unit: DistanceUnit;
  currency: string;
  updated_at: string;
}

export interface SettingsPayload {
  language?: Language;
  distance_unit?: DistanceUnit;
  currency?: string;
}

interface SettingsResponse {
  data: Settings;
}

/**
 * Talks to the settings API. The server stores a single row of preferences.
 */
@Service()
export class SettingsApi {
  private readonly http = inject(HttpClient);

  async get(): Promise<Settings> {
    const response = await firstValueFrom(this.http.get<SettingsResponse>('/api/settings'));
    return response.data;
  }

  async update(payload: SettingsPayload): Promise<Settings> {
    const response = await firstValueFrom(
      this.http.put<SettingsResponse>('/api/settings', payload),
    );
    return response.data;
  }
}
