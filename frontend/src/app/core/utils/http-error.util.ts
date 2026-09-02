import { HttpErrorResponse } from '@angular/common/http';

export type ErrorContext = 'login' | 'otp' | 'gateStaffCreate' | 'clientCreate' | 'gateStaffAction' | 'signup' | 'generic';

/**
 * Maps known backend error strings (currently English-only) to i18n translation
 * keys so the UI can display them in the user's active language instead of the
 * raw English string.
 */
const BACKEND_ERROR_MAP: Record<string, { key: string; params?: (v: string) => Record<string, string | number> }> = {
  'Username already taken': { key: 'errors.usernameTaken' },
  'Reserved super admin username': { key: 'errors.reservedUsername' },
  'A client account with this email already exists': { key: 'errors.emailTaken' },
  'Username must be at least 3 characters': { key: 'errors.usernameMinLength' },
  'Password must be at least 8 characters': { key: 'errors.passwordMinLength' },
  'A valid email is required': { key: 'errors.emailInvalidRaw' },
  'Organization name is required': { key: 'errors.nameRequired' },
  'username and password are required': { key: 'errors.credentialsRequired' },
  'A valid 8-character code is required': { key: 'errors.codeRequired' },
  'Too many attempts. Please try again later.': { key: 'errors.rateLimitedGeneric' },
  'Too many failed attempts. Please log in again.': { key: 'errors.rateLimitedGeneric' },
  'Invalid or expired code': { key: 'errors.wrongOtp' },
  'Invalid or expired code. Please try again.': { key: 'errors.wrongOtp' },
  // Event lifecycle
  'Start time must be before end time': { key: 'events.endBeforeStart' },
  'Select at least one room for this event': { key: 'errors.selectAtLeastOneRoom' },
  'Cannot change rooms for an event that has issued tickets': { key: 'errors.cannotChangeRooms' },
  'Event name is required': { key: 'events.nameRequired' },
  'Room not found': { key: 'errors.roomNotFound' },
  'Table not found': { key: 'errors.tableNotFound' },
};

/** Order-sensitive fallback matchers for messages with dynamic interpolations. */
const BACKEND_ERROR_PATTERNS: { pattern: RegExp; build: (m: RegExpMatchArray) => ErrorDescription }[] = [
  {
    pattern: /^Room '([^']*)' is already booked during this time$/,
    build: (m) => ({ key: 'errors.roomBooked', params: { room: m[1] } }),
  },
];

/**
 * Attempts to translate a raw backend error string into an error description
 * (i18n key + params). Returns the identity description (`__raw__`) when the
 * string is not one we know how to translate.
 */
export function translateBackendError(message: string): ErrorDescription {
  const match = BACKEND_ERROR_MAP[message];
  if (match) {
    return { key: match.key, params: match.params ? match.params(message) : undefined };
  }
  for (const { pattern, build } of BACKEND_ERROR_PATTERNS) {
    const m = message.match(pattern);
    if (m) return build(m);
  }
  return { key: '__raw__', params: { raw: message } };
}

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
      if (context === 'gateStaffCreate' || context === 'clientCreate' || context === 'signup') {
        return { key: 'errors.usernameTaken' };
      }
      return err.error?.error
        ? translateBackendError(toErrorMessage(err.error.error))
        : { key: 'errors.conflict' };

    case 422:
      return err.error?.error
        ? translateBackendError(toErrorMessage(err.error.error))
        : { key: 'errors.invalidInput' };

    case 429: {
      const retryAfter = err.error?.retryAfterSeconds;
      if (retryAfter) {
        return { key: 'errors.rateLimited', params: { seconds: retryAfter } };
      }
      return err.error?.error
        ? translateBackendError(toErrorMessage(err.error.error))
        : { key: 'errors.rateLimitedGeneric' };
    }

    case 500:
    case 502:
    case 503:
    case 504:
      return { key: 'errors.serverError' };

    default:
      return err.error?.error || err.error
        ? translateBackendError(toErrorMessage(err.error?.error ?? err.error))
        : { key: 'errors.generic' };
  }
}
