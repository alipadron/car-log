import { Component, inject } from '@angular/core';

import { Auth } from './auth/auth';
import { Unlock } from './unlock/unlock';
import { Vehicles } from './vehicles/vehicles';

@Component({
  selector: 'app-root',
  imports: [Unlock, Vehicles],
  templateUrl: './app.html',
})
export class App {
  protected readonly auth = inject(Auth);
}
