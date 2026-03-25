import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Location } from '@angular/common';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';

import { getApiErrorMessage } from '../../core/api/api.helpers';
import { AuthStore } from '../../core/auth/auth.store';
import { ChangePasswordRequest, UpdateProfileRequest, UserProfileResponse } from '../../models/user-profile.models';
import { UserProfileService } from '../../services/user-profile.service';

@Component({
  selector: 'app-settings-page',
  imports: [ReactiveFormsModule, InputTextModule, ButtonModule, DialogModule],
  templateUrl: './settings-page.component.html',
  styleUrl: './settings-page.component.scss',
})
export class SettingsPageComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly location = inject(Location);
  private readonly router = inject(Router);
  private readonly userProfileService = inject(UserProfileService);
  private readonly authStore = inject(AuthStore);

  readonly isLoading = signal(true);
  readonly isSaving = signal(false);
  readonly isUpdatingPassword = signal(false);
  readonly isPasswordDialogOpen = signal(false);
  readonly loadError = signal<string | null>(null);
  readonly profileSaveError = signal<string | null>(null);
  readonly profileSuccessMessage = signal<string | null>(null);
  readonly passwordError = signal<string | null>(null);
  readonly passwordSuccessMessage = signal<string | null>(null);
  readonly initialProfile = signal<UserProfileResponse | null>(null);
  readonly formSnapshot = signal({ name: '', email: '' });

  readonly profileForm = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
  });
  readonly passwordForm = this.formBuilder.nonNullable.group(
    {
      currentPassword: ['', [Validators.required]],
      newPassword: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]],
    },
    {
      validators: [passwordConfirmationValidator, newPasswordDifferenceValidator],
    },
  );

  readonly hasChanges = computed(() => {
    const profile = this.initialProfile();
    if (!profile) {
      return false;
    }

    return (
      this.formSnapshot().name.trim() !== profile.name ||
      this.formSnapshot().email.trim().toLowerCase() !== profile.email.toLowerCase()
    );
  });

  constructor() {
    this.profileForm.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        this.formSnapshot.set({
          name: value.name ?? '',
          email: value.email ?? '',
        });
      });

    this.passwordForm.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.passwordError.set(null);
      });

    this.loadProfile();
  }

  saveProfile(): void {
    this.normalizeFormValues();

    if (this.profileForm.invalid || !this.hasChanges() || this.isSaving()) {
      this.profileForm.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);
    this.profileSaveError.set(null);
    this.profileSuccessMessage.set(null);

    const payload: UpdateProfileRequest = {
      name: this.profileForm.controls.name.value.trim(),
      email: this.profileForm.controls.email.value.trim(),
    };

    this.userProfileService
      .updateCurrentProfile(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (profile) => {
          this.initialProfile.set(profile);
          this.profileForm.setValue({
            name: profile.name,
            email: profile.email,
          });
          this.formSnapshot.set({
            name: profile.name,
            email: profile.email,
          });
          this.profileForm.markAsPristine();
          this.authStore.setCurrentUser(profile);
          this.profileSuccessMessage.set('Profile updated');
          this.isSaving.set(false);
        },
        error: (error) => {
          this.profileSaveError.set(getApiErrorMessage(error, 'We could not update your profile right now.'));
          this.isSaving.set(false);
        },
      });
  }

  openPasswordDialog(): void {
    this.passwordSuccessMessage.set(null);
    this.passwordError.set(null);
    this.resetPasswordForm();
    this.isPasswordDialogOpen.set(true);
  }

  closePasswordDialog(): void {
    this.isPasswordDialogOpen.set(false);
    this.isUpdatingPassword.set(false);
    this.passwordError.set(null);
    this.resetPasswordForm();
  }

  handlePasswordDialogVisibleChange(visible: boolean): void {
    if (!visible) {
      this.closePasswordDialog();
    }
  }

  updatePassword(): void {
    if (this.passwordForm.invalid || this.isUpdatingPassword()) {
      this.passwordForm.markAllAsTouched();
      return;
    }

    this.isUpdatingPassword.set(true);
    this.passwordError.set(null);
    this.passwordSuccessMessage.set(null);

    const payload: ChangePasswordRequest = {
      currentPassword: this.passwordForm.controls.currentPassword.value,
      newPassword: this.passwordForm.controls.newPassword.value,
    };

    this.userProfileService.changePassword(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.isUpdatingPassword.set(false);
          this.passwordSuccessMessage.set('Password updated');
          this.closePasswordDialog();
        },
        error: (error) => {
          this.passwordError.set(getApiErrorMessage(error, 'We could not update your password right now.'));
          this.isUpdatingPassword.set(false);
        },
      });
  }

  getFieldError(fieldName: 'name' | 'email'): string | null {
    const control = this.profileForm.controls[fieldName];
    if (!control.errors || (!control.touched && !control.dirty)) {
      return null;
    }

    if (control.errors['required']) {
      return fieldName === 'name' ? 'Name is required.' : 'Email is required.';
    }

    if (control.errors['email']) {
      return 'Enter a valid email address.';
    }

    return 'This field is invalid.';
  }

  getPasswordFieldError(
    fieldName: 'currentPassword' | 'newPassword' | 'confirmPassword',
  ): string | null {
    const control = this.passwordForm.controls[fieldName];
    if (!control.errors && !this.passwordForm.errors) {
      return null;
    }

    if (!control.touched && !control.dirty) {
      return null;
    }

    if (control.errors?.['required']) {
      if (fieldName === 'currentPassword') {
        return 'Current password is required.';
      }

      if (fieldName === 'newPassword') {
        return 'New password is required.';
      }

      return 'Confirm your new password.';
    }

    if (control.errors?.['minlength']) {
      return 'Password must be at least 8 characters.';
    }

    if (fieldName === 'newPassword' && this.passwordForm.errors?.['samePassword']) {
      return 'New password must be different from your current password.';
    }

    if (fieldName === 'confirmPassword' && this.passwordForm.errors?.['passwordMismatch']) {
      return 'Confirm password must match the new password.';
    }

    return 'This field is invalid.';
  }

  protected retryLoad(): void {
    this.loadProfile();
  }

  protected goBack(): void {
    const previousRoute = window.history.state?.from as string | undefined;

    if (previousRoute && previousRoute !== '/settings') {
      void this.router.navigateByUrl(previousRoute);
      return;
    }

    this.location.back();
  }

  private loadProfile(): void {
    this.isLoading.set(true);
    this.loadError.set(null);
    this.profileSaveError.set(null);
    this.profileSuccessMessage.set(null);

    this.userProfileService
      .getCurrentProfile()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (profile) => {
          this.initialProfile.set(profile);
          this.profileForm.setValue({
            name: profile.name,
            email: profile.email,
          });
          this.formSnapshot.set({
            name: profile.name,
            email: profile.email,
          });
          this.profileForm.markAsPristine();
          this.authStore.setCurrentUser(profile);
          this.isLoading.set(false);
        },
        error: (error) => {
          this.loadError.set(getApiErrorMessage(error, 'We could not load your profile right now.'));
          this.isLoading.set(false);
        },
      });
  }

  private normalizeFormValues(): void {
    this.profileForm.patchValue(
      {
        name: this.profileForm.controls.name.value.trim(),
        email: this.profileForm.controls.email.value.trim(),
      },
      { emitEvent: false },
    );
    this.formSnapshot.set(this.profileForm.getRawValue());
  }

  private resetPasswordForm(): void {
    this.passwordForm.reset({
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    });
    this.passwordForm.markAsPristine();
    this.passwordForm.markAsUntouched();
  }
}

function passwordConfirmationValidator(control: AbstractControl): ValidationErrors | null {
  const newPassword = control.get('newPassword')?.value;
  const confirmPassword = control.get('confirmPassword')?.value;

  if (!newPassword || !confirmPassword || newPassword === confirmPassword) {
    return null;
  }

  return { passwordMismatch: true };
}

function newPasswordDifferenceValidator(control: AbstractControl): ValidationErrors | null {
  const currentPassword = control.get('currentPassword')?.value;
  const newPassword = control.get('newPassword')?.value;

  if (!currentPassword || !newPassword || currentPassword !== newPassword) {
    return null;
  }

  return { samePassword: true };
}
