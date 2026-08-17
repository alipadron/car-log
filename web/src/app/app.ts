import { Component, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';

interface HealthResponse {
  status: string;
  db: string;
}

@Component({
  selector: 'app-root',
  imports: [],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  private readonly http = inject(HttpClient);
  protected readonly health = signal<'loading' | 'ok' | 'unreachable'>('loading');

  constructor() {
    this.http.get<HealthResponse>('/api/health').subscribe({
      next: (res) => this.health.set(res.status === 'ok' && res.db === 'ok' ? 'ok' : 'unreachable'),
      error: () => this.health.set('unreachable'),
    });
  }
}
