import { zodResolver } from '@hookform/resolvers/zod';
import { Button, TextInput } from 'flowbite-react';
import { useEffect, useRef, useState, type RefObject } from 'react';
import { useForm } from 'react-hook-form';
import { AppModal } from '../../shared/ui/app-modal';
import { FormField } from '../../shared/ui/form-field';
import { passwordSchema, type PasswordFormValues } from './settings-schema';
import { getSettingsErrorMessage, useChangePassword } from './use-settings';

interface PasswordDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  returnFocusRef?: RefObject<HTMLElement | null>;
}

export function PasswordDialog({ open, onClose, onSuccess, returnFocusRef }: PasswordDialogProps) {
  const [serverError, setServerError] = useState<string | null>(null);
  const changePasswordMutation = useChangePassword();
  const currentPasswordInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isValid, isSubmitting },
  } = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    mode: 'onTouched',
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  useEffect(() => {
    if (open) {
      setServerError(null);
      reset({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    }
  }, [open, reset]);

  function handleClose() {
    setServerError(null);
    reset({
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    });
    onClose();
  }

  const isPending = isSubmitting || changePasswordMutation.isPending;

  async function onSubmit(values: PasswordFormValues) {
    setServerError(null);
    try {
      await changePasswordMutation.mutateAsync({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      handleClose();
      onSuccess();
    } catch (error) {
      setServerError(getSettingsErrorMessage(error, 'We could not update your password right now.'));
    }
  }

  const currentPasswordRegistration = register('currentPassword', {
    onChange: () => setServerError(null),
  });
  const newPasswordRegistration = register('newPassword', {
    onChange: () => setServerError(null),
  });
  const confirmPasswordRegistration = register('confirmPassword', {
    onChange: () => setServerError(null),
  });

  return (
    <AppModal
      open={open}
      onClose={handleClose}
      title="Change Password"
      description="Changing your password signs you out on all devices. Sign in again with your new password."
      error={serverError ?? undefined}
      initialFocusRef={currentPasswordInputRef}
      returnFocusRef={returnFocusRef}
    >
      <form
        noValidate
        aria-label="Change Password Form"
        className="space-y-4"
        onSubmit={(event) => void handleSubmit(onSubmit)(event)}
      >
        <FormField label="Current Password" error={errors.currentPassword?.message}>
          {(attributes) => (
            <TextInput
              {...attributes}
              {...currentPasswordRegistration}
              ref={(node) => {
                void currentPasswordRegistration.ref(node);
                currentPasswordInputRef.current = node;
              }}
              type="password"
              autoComplete="current-password"
            />
          )}
        </FormField>

        <FormField label="New Password" error={errors.newPassword?.message}>
          {(attributes) => (
            <TextInput
              {...attributes}
              {...newPasswordRegistration}
              type="password"
              autoComplete="new-password"
            />
          )}
        </FormField>

        <FormField label="Confirm New Password" error={errors.confirmPassword?.message}>
          {(attributes) => (
            <TextInput
              {...attributes}
              {...confirmPasswordRegistration}
              type="password"
              autoComplete="new-password"
            />
          )}
        </FormField>

        <div className="flex flex-wrap justify-end gap-3 pt-2">
          <Button color="alternative" type="button" disabled={isPending} onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" color="blue" disabled={isPending || !isValid}>
            {isPending ? 'Updating…' : 'Update Password'}
          </Button>
        </div>
      </form>
    </AppModal>
  );
}
