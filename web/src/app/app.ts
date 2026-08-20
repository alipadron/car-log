import { Component, inject } from '@angular/core';
import { HlmButtonImports } from '@spartan-ng/helm/button';

import { Auth } from './auth/auth';
import { Theme } from './theme';
import { Unlock } from './unlock/unlock';
import { Vehicles } from './vehicles/vehicles';

@Component({
  selector: 'app-root',
  imports: [Unlock, Vehicles, HlmButtonImports],
  templateUrl: './app.html',
})
export class App {
  protected readonly auth = inject(Auth);
  protected readonly theme = inject(Theme);
}
