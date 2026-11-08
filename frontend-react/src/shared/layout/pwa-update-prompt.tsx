import { useState } from 'react';
import { Button } from 'flowbite-react';
import { RefreshCw, X, AlertTriangle } from 'lucide-react';
import { usePwaUpdate, type PwaUpdateHook } from '../../core/pwa/use-pwa-update';
import { useWorkGuard } from '../../core/work-guard/work-guard-context';

interface PwaUpdatePromptProps {
  /** Optional hook override for tests or custom environments */
  pwaHook?: PwaUpdateHook;
}

export function PwaUpdatePrompt({ pwaHook }: PwaUpdatePromptProps) {
  const defaultHook = usePwaUpdate();
  const { needRefresh, updateServiceWorker, dismissUpdate } = pwaHook ?? defaultHook;
  const { check } = useWorkGuard();

  const [confirmingDiscard, setConfirmingDiscard] = useState(false);
  const [busyNotice, setBusyNotice] = useState<string | null>(null);

  if (!needRefresh) {
    return null;
  }

  const handleUpdateClick = () => {
    setBusyNotice(null);
    const status = check();

    if (status.isBusy) {
      setBusyNotice(`An operation is currently in progress: ${status.reasons.join(', ')}. Please wait for it to complete.`);
      return;
    }

    if (status.hasUnsavedChanges) {
      setConfirmingDiscard(true);
      return;
    }

    void updateServiceWorker(true);
  };

  const handleForceUpdate = () => {
    setConfirmingDiscard(false);
    void updateServiceWorker(true);
  };

  const handleCancelConfirmation = () => {
    setConfirmingDiscard(false);
  };

  return (
    <aside
      role="region"
      aria-label="Application update notice"
      className="fixed bottom-4 right-4 z-50 max-w-md w-[calc(100%-2rem)] rounded-2xl border border-ut-border bg-ut-surface p-4 text-ut-text shadow-2xl transition-all duration-200"
      style={{
        paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 1rem))',
        paddingRight: 'max(1rem, env(safe-area-inset-right, 1rem))',
      }}
    >
      {busyNotice ? (
        <div className="space-y-3" role="alert">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--ut-status-expiring-bg)] text-[var(--ut-status-expiring-text)]">
              <AlertTriangle className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-semibold">Update deferred</h3>
              <p className="mt-1 text-sm text-ut-muted">{busyNotice}</p>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button size="sm" color="alternative" onClick={() => setBusyNotice(null)}>
              OK
            </Button>
          </div>
        </div>
      ) : confirmingDiscard ? (
        <div className="space-y-3" role="alert">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--ut-status-expired-bg)] text-[var(--ut-status-expired-text)]">
              <AlertTriangle className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-semibold">Unsaved changes detected</h3>
              <p className="mt-1 text-sm text-ut-muted">
                Updating now will reload the page and discard unsaved form changes. Save your work first, or choose to discard and update.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap justify-end gap-2 pt-1">
            <Button size="sm" color="alternative" onClick={handleCancelConfirmation}>
              Keep editing
            </Button>
            <Button size="sm" color="red" onClick={handleForceUpdate}>
              Discard and update
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ut-primary-subtle text-ut-primary">
            <RefreshCw className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-semibold leading-tight">A new version of UpTrack is available</h3>
            <p className="mt-1 text-sm text-ut-muted">Update now to load the latest improvements.</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button size="sm" color="blue" onClick={handleUpdateClick}>
                Update now
              </Button>
              <Button size="sm" color="alternative" onClick={dismissUpdate}>
                Later
              </Button>
            </div>
          </div>
          <button
            type="button"
            aria-label="Dismiss update notification"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ut-muted hover:bg-ut-hover"
            onClick={dismissUpdate}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )}
    </aside>
  );
}
