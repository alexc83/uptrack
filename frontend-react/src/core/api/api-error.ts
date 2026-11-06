export type ApiErrorKind = 'http' | 'network' | 'response' | 'timeout';
export const fallbackMessage = 'Something went wrong. Please try again.';
/** Shown when the server cannot be reached or a gateway reports it is down. Does not claim a deployment is underway. */
export const networkMessage = "UpTrack is temporarily unavailable. We're having trouble connecting to the server. This may happen during a system update. Please try again shortly.";
export const timeoutMessage = "UpTrack didn't respond in time. This may happen during a system update. Please try again shortly.";
export const slowRequestMessage = 'The server is taking longer than expected. Your request is still processing.';
export const recoveredMessage = 'UpTrack is available again.';

// Never attach request URLs, headers, credentials or request bodies to errors.
export class ApiError extends Error {
  readonly name = 'ApiError';
  constructor(
    readonly kind: ApiErrorKind,
    readonly status: number,
    message = fallbackMessage,
    readonly details?: unknown,
  ) { super(message); }
}
export function isAbortError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'name' in error && error.name === 'AbortError';
}
export function errorMessage(details: unknown): string {
  if (typeof details === 'object' && details !== null && 'message' in details && typeof details.message === 'string' && details.message.trim()) return details.message;
  return fallbackMessage;
}

const gatewayStatuses = new Set([502, 503, 504]);
/** A 502/503/504 whose body is not an application JSON error: it came from a proxy/platform, not from UpTrack's own handlers. */
export function isGatewayFailure(status: number, details: unknown): boolean {
  return gatewayStatuses.has(status) && !(typeof details === 'object' && details !== null && 'message' in details);
}
/**
 * True when the service itself could not answer (no connection, timed out, or a gateway error).
 * Application errors — 401, 4xx validation, 500 from our own handlers, 503 with an UpTrack message — are not outages.
 */
export function isServiceUnavailable(error: unknown): boolean {
  if (!(error instanceof ApiError)) return false;
  if (error.kind === 'network' || error.kind === 'timeout') return true;
  return error.kind === 'http' && isGatewayFailure(error.status, error.details);
}
