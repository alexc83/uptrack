export type ApiErrorKind = 'http' | 'network' | 'response';
export const fallbackMessage = 'Something went wrong. Please try again.';
export const networkMessage = 'Unable to reach the server right now. Please try again.';

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
