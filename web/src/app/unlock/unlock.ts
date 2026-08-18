import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { form, FormField, required, submit } from '@angular/forms/signals';
import { firstValueFrom } from 'rxjs';

import { Auth } from '../auth/auth';

interface UnlockFormModel {
  password: string;
}

interface TokenResponse {
  token: string;
}

@Component({
  selector: 'app-unlock',
  imports: [FormField],
  templateUrl: './unlock.html',
  styleUrl: './unlock.css',
})
export class Unlock {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(Auth);

  protected readonly model = signal<UnlockFormModel>({ password: '' });
  protected readonly unlockForm = form(this.model, (path) => {
    required(path.password, { message: 'Enter the password.' });
  });
  protected readonly error = signal<string | null>(null);
  protected readonly submitting = signal(false);

  protected unlock(): void {
    submit(this.unlockForm, async () => {
      this.error.set(null);
      this.submitting.set(true);

      try {
        const response = await firstValueFrom(
          this.http.post<TokenResponse>('/api/auth/token', {
            password: this.model().password,
          }),
        );
        this.auth.setToken(response.token);
      } catch (error) {
        this.error.set(
          error instanceof HttpErrorResponse && error.status === 401
            ? 'Wrong password.'
            : 'Could not reach the server. Try again later.',
        );
      } finally {
        this.submitting.set(false);
      }
    });
  }
}
