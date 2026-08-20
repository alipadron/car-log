import { Component, inject, signal } from '@angular/core';
import { HlmButtonImports } from '@spartan-ng/helm/button';

import { Auth } from './auth/auth';
import { Home } from './home/home';
import { I18n } from './i18n/translations';
import { SettingsForm } from './settings/settings-form';
import { Theme } from './theme';
import { Unlock } from './unlock/unlock';
import { Vehicle } from './vehicles/vehicles-api';
import { VehicleDetail } from './vehicles/vehicle-detail';
import { Vehicles } from './vehicles/vehicles';

@Component({
  selector: 'app-root',
  imports: [Unlock, Home, Vehicles, VehicleDetail, SettingsForm, HlmButtonImports],
  templateUrl: './app.html',
})
export class App {
  protected readonly auth = inject(Auth);
  protected readonly theme = inject(Theme);
  protected readonly i18n = inject(I18n);
  protected readonly activeView = signal<'home' | 'vehicles' | 'settings'>('home');
  protected readonly selectedVehicle = signal<Vehicle | null>(null);
}
