import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Location } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';

import { getApiErrorMessage } from '../../core/api/api.helpers';
import { AuthStore } from '../../core/auth/auth.store';
import { UpdateProfileRequest, UserProfileResponse } from '../../models/user-profile.models';
import { UserProfileService } from '../../services/user-profile.service';

@Component({
  selector: 'app-settings-page',
  imports: [ReactiveFormsModule, InputTextModule, ButtonModule],
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
  readonly loadError = signal<string | null>(null);
  readonly saveError = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);
  readonly initialProfile = signal<UserProfileResponse | null>(null);
  readonly formSnapshot = signal({ name: '', email: '' });

  readonly profileForm = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
  });

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

    this.loadProfile();
  }

  saveProfile(): void {
    this.normalizeFormValues();

    if (this.profileForm.invalid || !this.hasChanges() || this.isSaving()) {
      this.profileForm.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);
    this.saveError.set(null);
    this.successMessage.set(null);

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
          this.successMessage.set('Profile updated');
          this.isSaving.set(false);
        },
        error: (error) => {
          this.saveError.set(getApiErrorMessage(error, 'We could not update your profile right now.'));
          this.isSaving.set(false);
        },
      });
  }

  protected getFieldError(fieldName: 'name' | 'email'): string | null {
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
    this.saveError.set(null);
    this.successMessage.set(null);

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
}
