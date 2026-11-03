import { zodResolver } from '@hookform/resolvers/zod';
import { Button, TextInput } from 'flowbite-react';
import { useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import type { UserProfileResponse } from '../../lib/dto/users';
import { FormField } from '../../shared/ui/form-field';
import { profileSchema, type ProfileFormValues } from './settings-schema';
import { getSettingsErrorMessage, useUpdateProfile } from './use-settings';

interface ProfileCardProps {
  profile: UserProfileResponse;
}

export function ProfileCard({ profile }: ProfileCardProps) {
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const updateProfileMutation = useUpdateProfile();

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isValid, isSubmitting },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    mode: 'onTouched',
    defaultValues: {
      name: profile.name,
      email: profile.email,
    },
  });

  // When profile prop changes (e.g. reload), re-sync default values
  useEffect(() => {
    reset({
      name: profile.name,
      email: profile.email,
    });
  }, [profile, reset]);

  const watchedName = useWatch({ control, name: 'name' }) ?? '';
  const watchedEmail = useWatch({ control, name: 'email' }) ?? '';

  const hasChanges =
    watchedName.trim() !== profile.name ||
    watchedEmail.trim().toLowerCase() !== profile.email.toLowerCase();

  const isSaving = isSubmitting || updateProfileMutation.isPending;

  async function onSubmit(values: ProfileFormValues) {
    setSaveError(null);
    setSuccessMessage(null);

    const payload = {
      name: values.name.trim(),
      email: values.email.trim(),
    };

    try {
      const updated = await updateProfileMutation.mutateAsync(payload);
      reset({
        name: updated.name,
        email: updated.email,
      });
      setSuccessMessage('Profile updated');
    } catch (error) {
      setSaveError(getSettingsErrorMessage(error, 'We could not update your profile right now.'));
    }
  }

  return (
    <section className="rounded-2xl border border-ut-border bg-ut-surface p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="text-xl font-bold text-ut-text">Profile</h2>
        <p className="mt-1 text-sm text-ut-muted">
          Update the name and email tied to your UpTrack account.
        </p>
      </div>

      {successMessage && (
        <div
          role="status"
          className="mb-4 rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-800 dark:border-green-800/40 dark:bg-green-950/40 dark:text-green-300"
        >
          {successMessage}
        </div>
      )}

      {saveError && (
        <div
          role="alert"
          className="mb-4 rounded-xl border border-red-200 bg-[var(--ut-status-expired-bg)] p-3 text-sm text-[var(--ut-status-expired-text)] dark:border-red-900/50"
        >
          {saveError}
        </div>
      )}

      <form
        noValidate
        aria-label="Profile Form"
        className="space-y-4"
        onSubmit={(event) => void handleSubmit(onSubmit)(event)}
      >
        <FormField label="Name" error={errors.name?.message}>
          {(attributes) => (
            <TextInput
              {...attributes}
              {...register('name')}
              type="text"
              autoComplete="name"
            />
          )}
        </FormField>

        <FormField label="Email" error={errors.email?.message}>
          {(attributes) => (
            <TextInput
              {...attributes}
              {...register('email')}
              type="email"
              autoComplete="email"
            />
          )}
        </FormField>

        <div className="pt-1">
          <Button
            type="submit"
            color="blue"
            disabled={!isValid || !hasChanges || isSaving}
          >
            {isSaving ? 'Saving…' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </section>
  );
}
