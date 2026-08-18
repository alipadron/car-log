import { Component, inject } from '@angular/core';

import { Auth } from './auth/auth';
import { HealthStatus } from './health-status/health-status';
import { Unlock } from './unlock/unlock';

@Component({
  selector: 'app-root',
  imports: [Unlock, HealthStatus],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly auth = inject(Auth);
}
