import { HttpErrorResponse } from '@angular/common/http';

export type ErrorContext = 'login' | 'otp' | 'gateStaffCreate' | 'gateStaffAction' | 'generic';

export interface ErrorDescription {
  /** Translation key to look up (e.g. "errors.wrongCredentials") */
  key: string;
  /** Interpolation params for the translated string, if any */
  params?: Record<string, string | number>;
}

/**
 * Turns a raw HTTP error (or network failure) into a specific translation
 * key + params, rather than a hardcoded string, so the resulting message
 * respects whichever language is currently selected. The caller passes
 * this straight into the i18next translation service.
 */
export function describeHttpError(err: unknown, context: ErrorContext = 'generic'): ErrorDescription {
  if (!(err instanceof HttpErrorResponse)) {
    return { key: 'errors.generic' };
  }

  if (err.status === 0) {
    return { key: 'errors.noConnection' };
  }

  switch (err.status) {
    case 401:
      if (context === 'login') return { key: 'errors.wrongCredentials' };
      if (context === 'otp') return { key: 'errors.wrongOtp' };
      return { key: 'errors.notAuthenticated' };

    case 403:
      return { key: 'errors.forbidden' };

    case 404:
      return { key: 'errors.notFound' };

    case 409:
      if (context === 'gateStaffCreate') return { key: 'errors.usernameTaken' };
      return { key: 'errors.conflict' };

    case 422:
      return err.error?.error
        ? { key: '__raw__', params: { raw: err.error.error } }
        : { key: 'errors.invalidInput' };

    case 429: {
      const retryAfter = err.error?.retryAfterSeconds;
      return retryAfter
        ? { key: 'errors.rateLimited', params: { seconds: retryAfter } }
        : { key: 'errors.rateLimitedGeneric' };
    }

    case 500:
    case 502:
    case 503:
    case 504:
      return { key: 'errors.serverError' };

    default:
      return err.error?.error
        ? { key: '__raw__', params: { raw: err.error.error } }
        : { key: 'errors.generic' };
  }
}
