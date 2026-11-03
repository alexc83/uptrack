import { Button } from 'flowbite-react';
import type { RefObject } from 'react';

interface SecurityCardProps {
  onOpenPasswordDialog: () => void;
  passwordSuccessMessage: string | null;
  changePasswordButtonRef?: RefObject<HTMLButtonElement | null>;
}

export function SecurityCard({
  onOpenPasswordDialog,
  passwordSuccessMessage,
  changePasswordButtonRef,
}: SecurityCardProps) {
  return (
    <section className="rounded-2xl border border-ut-border bg-ut-surface p-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-ut-text">Security</h2>
          <p className="mt-1 text-sm text-ut-muted">Update your password.</p>
        </div>

        <Button
          ref={changePasswordButtonRef}
          type="button"
          color="alternative"
          className="w-full sm:w-auto"
          onClick={onOpenPasswordDialog}
        >
          Change Password
        </Button>
      </div>

      {passwordSuccessMessage && (
        <div
          role="status"
          className="mt-4 rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-800 dark:border-green-800/40 dark:bg-green-950/40 dark:text-green-300"
        >
          {passwordSuccessMessage}
        </div>
      )}
    </section>
  );
}
