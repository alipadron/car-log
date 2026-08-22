import { HttpErrorResponse } from '@angular/common/http';

/** True when a failure carried no HTTP response — the server could not be reached. */
export function isConnectionFailure(error: unknown): boolean {
  return !(error instanceof HttpErrorResponse && error.status);
}