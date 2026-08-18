import { Component, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';

interface HealthResponse {
  status: string;
  db: string;
}

@Component({
  selector: 'app-health-status',
  template: '<p>API health: {{ health() }}</p>',
})
export class HealthStatus {
  private readonly http = inject(HttpClient);
  protected readonly health = signal<'loading' | 'ok' | 'unreachable'>('loading');

  constructor() {
    this.http.get<HealthResponse>('/api/health').subscribe({
      next: (res) => this.health.set(res.status === 'ok' && res.db === 'ok' ? 'ok' : 'unreachable'),
      error: () => this.health.set('unreachable'),
    });
  }
}
