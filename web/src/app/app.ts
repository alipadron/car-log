import { Component, inject, signal } from '@angular/core';
import { HlmButtonImports } from '@spartan-ng/helm/button';

import { Auth } from './auth/auth';
import { I18n } from './i18n/translations';
import { SettingsForm } from './settings/settings-form';
import { Theme } from './theme';
import { Unlock } from './unlock/unlock';
import { Vehicles } from './vehicles/vehicles';

@Component({
  selector: 'app-root',
  imports: [Unlock, Vehicles, SettingsForm, HlmButtonImports],
  templateUrl: './app.html',
})
export class App {
  protected readonly auth = inject(Auth);
  protected readonly theme = inject(Theme);
  protected readonly i18n = inject(I18n);
  protected readonly activeView = signal<'vehicles' | 'settings'>('vehicles');
}
