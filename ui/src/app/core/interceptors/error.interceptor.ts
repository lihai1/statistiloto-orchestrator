import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 401) {
        console.warn('Unauthorized — token may be expired', err.url);
      } else if (err.status === 429) {
        console.warn('Rate limited by edge proxy', err.url);
      }
      return throwError(() => err);
    }),
  );
};
