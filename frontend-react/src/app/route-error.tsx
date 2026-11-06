import { isRouteErrorResponse, useRouteError } from 'react-router-dom';

const chunkPatterns = [/dynamically imported module/i, /importing a module script failed/i, /unable to preload/i, /loading chunk .* failed/i, /error loading dynamically/i];
/** A lazy route chunk that no longer exists (typically an open tab after a new frontend deployment) or could not be fetched. */
export function isChunkLoadError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : typeof error === 'string' ? error : '';
  return chunkPatterns.some((pattern) => pattern.test(message));
}

/**
 * Route error boundary. For a stale or unreachable chunk it recommends a refresh; it never reloads on its own,
 * so unsaved input is not discarded. The session is untouched.
 */
export function RouteError() {
  const error = useRouteError();
  const stale = isChunkLoadError(error);
  const notFound = isRouteErrorResponse(error) && error.status === 404;
  return (
    <main className="mx-auto max-w-xl space-y-4 p-6" role="alert">
      <h1 className="text-xl font-semibold">{stale ? 'A new version of UpTrack is available' : notFound ? 'Page not found' : 'Something went wrong'}</h1>
      <p className="text-ut-muted">
        {stale
          ? 'This page could not be loaded because UpTrack was updated or the connection was interrupted. Refresh to load the latest version. Save any unsaved changes first.'
          : 'We could not display this page. Refresh to try again.'}
      </p>
      <button type="button" className="min-h-11 rounded-lg bg-ut-primary px-4 font-medium text-white" onClick={() => window.location.reload()}>Refresh</button>
      <a href="/" className="ml-3 inline-flex min-h-11 items-center text-ut-primary underline">Go to UpTrack home</a>
    </main>
  );
}
