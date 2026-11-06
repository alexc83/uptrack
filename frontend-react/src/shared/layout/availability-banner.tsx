import { Button } from 'flowbite-react';
import { networkMessage, recoveredMessage } from '../../core/api/api-error';
import { useServiceAvailability } from '../../core/availability/use-service-availability';

/** Non-blocking notice inside the signed-in shell. The live region stays mounted so changes are announced. */
export function AvailabilityBanner() {
  const { state, retry, dismiss } = useServiceAvailability();
  return <div aria-live="polite" aria-atomic="true" className="mx-4 mt-3 empty:hidden">
    {state === 'unavailable' && <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-[var(--ut-status-expiring-bg)] p-3 text-sm text-[var(--ut-status-expiring-text)]">
      <p>{networkMessage} You are still signed in; your changes are not lost until you leave this page.</p>
      <Button size="sm" color="alternative" onClick={retry}>Try again</Button>
    </div>}
    {state === 'recovered' && <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-[var(--ut-status-active-bg)] p-3 text-sm text-[var(--ut-status-active-text)]">
      <p>{recoveredMessage} Your data is being refreshed.</p>
      <Button size="sm" color="alternative" onClick={dismiss}>Dismiss</Button>
    </div>}
  </div>;
}
