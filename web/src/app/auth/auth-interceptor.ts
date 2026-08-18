import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';

import { Auth } from './auth';

/**
 * Attaches the stored API token to every request and locks the app again
 * when the API rejects it with a 401.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(Auth);
  const token = auth.token();

  const authenticatedReq = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authenticatedReq).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === 401 && token) {
        auth.lock();
      }

      return throwError(() => error);
    }),
  );
};
