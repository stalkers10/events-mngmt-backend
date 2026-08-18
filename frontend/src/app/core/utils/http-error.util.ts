import { HttpErrorResponse } from '@angular/common/http';

export type ErrorContext = 'login' | 'otp' | 'gateStaffCreate' | 'clientCreate' | 'gateStaffAction' | 'generic';

export interface ErrorDescription {
  /** Translation key to look up (e.g. "errors.wrongCredentials") */
  key: string;
  /** Interpolation params for the translated string, if any */
  params?: Record<string, string | number>;
}

/**
 * Flattens an unknown backend error payload into a list of human-readable
 * messages. Handles Zod's `.flatten()` shape ({ formErrors, fieldErrors }) as
 * well as `{ error: string }` / `{ message: string }` / plain string bodies.
 */
function collectErrorMessages(value: unknown, acc: string[]): void {
  if (!value || typeof value !== 'object') {
    if (typeof value === 'string') acc.push(value);
    return;
  }
  const obj = value as Record<string, unknown>;

  if (typeof obj['error'] === 'string') {
    acc.push(obj['error']);
    return;
  }
  if (typeof obj['message'] === 'string') {
    acc.push(obj['message']);
    return;
  }
  if (Array.isArray(obj['formErrors'])) {
    for (const e of obj['formErrors']) {
      if (typeof e === 'string') acc.push(e);
    }
  }
  const fieldErrors = obj['fieldErrors'];
  if (fieldErrors && typeof fieldErrors === 'object') {
    for (const messages of Object.values(fieldErrors)) {
      if (Array.isArray(messages)) {
        for (const m of messages) {
          if (typeof m === 'string') acc.push(m);
        }
      }
    }
  }
}

/** Converts any backend error payload into a single user-facing string. */
export function toErrorMessage(value: unknown): string {
  const messages: string[] = [];
  collectErrorMessages(value, messages);
  if (messages.length > 0) {
    return messages.join(' ');
  }
  if (typeof value === 'string') {
    return value;
  }
  try {
    return JSON.stringify(value);
  } catch {
    return 'Unexpected error';
  }
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
      if (err.error?.error === 'Reserved super admin username') {
        return { key: 'errors.reservedUsername' };
      }
      if (context === 'gateStaffCreate' || context === 'clientCreate') return { key: 'errors.usernameTaken' };
      return { key: 'errors.conflict' };

    case 422:
      return err.error?.error
        ? { key: '__raw__', params: { raw: toErrorMessage(err.error.error) } }
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
      return err.error?.error || err.error
        ? { key: '__raw__', params: { raw: toErrorMessage(err.error?.error ?? err.error) } }
        : { key: 'errors.generic' };
  }
}
