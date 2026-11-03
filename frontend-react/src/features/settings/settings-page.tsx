import { ArrowLeft } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { PageContainer } from '../../shared/layout/page-container';
import { StateBlock } from '../../shared/ui/state-block';
import { PasswordDialog } from './password-dialog';
import { ProfileCard } from './profile-card';
import { SecurityCard } from './security-card';
import { SettingsSessionBoundary } from './settings-session-boundary';
import { getSettingsErrorMessage, useProfile } from './use-settings';

export function SettingsPage() {
  return (
    <SettingsSessionBoundary>
      <SettingsContent />
    </SettingsSessionBoundary>
  );
}

function SettingsContent() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [passwordSuccessMessage, setPasswordSuccessMessage] = useState<string | null>(null);
  const changePasswordTriggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    document.title = 'Settings — UpTrack';
  }, []);

  const { data: profile, isLoading, isError, error, refetch, isFetching } = useProfile();

  function handleBack() {
    const from = (location.state as { from?: string } | null)?.from;
    if (from && from !== '/settings') {
      navigate(from);
    } else {
      navigate(-1);
    }
  }

  function handleOpenPasswordDialog() {
    setPasswordSuccessMessage(null);
    setIsPasswordDialogOpen(true);
  }

  return (
    <PageContainer>
      <div className="relative mx-auto w-full max-w-[46rem]">
        <button
          type="button"
          onClick={handleBack}
          className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--ut-primary)] hover:underline md:mb-4"
        >
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          <span>Back</span>
        </button>

        <header className="mb-6">
          <span className="inline-block text-xs font-extrabold uppercase tracking-wider text-[var(--ut-primary)]">
            Account
          </span>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-ut-text sm:text-4xl">
            Settings
          </h1>
          <p className="mt-2 text-sm text-ut-muted">Manage your account information.</p>
        </header>

        {isLoading && (
          <section
            className="space-y-4 rounded-2xl border border-ut-border bg-ut-surface p-5 shadow-sm"
            aria-label="Loading settings"
            aria-busy="true"
          >
            <div className="h-5 w-1/3 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse" />
            <div className="h-4 w-3/4 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse" />
            <div className="h-4 w-1/2 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse" />
            <div className="mt-4 h-10 w-32 rounded-lg bg-slate-200 dark:bg-slate-700 animate-pulse" />
          </section>
        )}

        {isError && (
          <StateBlock
            kind="error"
            title="Settings unavailable"
            message={getSettingsErrorMessage(error, 'We could not load your profile right now.')}
            action={{
              label: isFetching ? 'Retrying…' : 'Retry',
              onClick: () => void refetch(),
            }}
          />
        )}

        {profile && !isLoading && (
          <div className="ut-fade-in flex flex-col gap-6">
            <ProfileCard profile={profile} />

            <SecurityCard
              onOpenPasswordDialog={handleOpenPasswordDialog}
              passwordSuccessMessage={passwordSuccessMessage}
              changePasswordButtonRef={changePasswordTriggerRef}
            />

            <PasswordDialog
              open={isPasswordDialogOpen}
              onClose={() => setIsPasswordDialogOpen(false)}
              onSuccess={() => setPasswordSuccessMessage('Password updated')}
              returnFocusRef={changePasswordTriggerRef}
            />
          </div>
        )}
      </div>
    </PageContainer>
  );
}
