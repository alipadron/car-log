import { HttpErrorResponse, HttpEvent, HttpEventType, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, catchError, tap, throwError } from 'rxjs';

import { Connectivity } from './connectivity';
import { Sync } from './sync';

/**
 * Reports whether the server is reachable to the {@link Connectivity} service,
 * so the app shell can show an offline indicator, and kicks the outbox replay
 * after any successful response so queued entries sync when the server returns.
 *
 * Any HTTP response — regardless of status — means the server answered and is
 * reachable. Only a connection-level failure with no HTTP status (network
 * error, DNS failure, status 0) is treated as unreachable.
 */
export const connectivityInterceptor: HttpInterceptorFn = (req, next) => {
  const connectivity = inject(Connectivity);
  const sync = inject(Sync);

  return next(req).pipe(
    tap((event: HttpEvent<unknown>) => {
      if (event.type === HttpEventType.Response) {
        connectivity.reportServerSuccess();
        void sync.attemptFlush();
      }
    }),
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status) {
        connectivity.reportServerSuccess();
      } else {
        connectivity.reportServerFailure();
      }
      return throwError(() => error);
    }),
  );
}
