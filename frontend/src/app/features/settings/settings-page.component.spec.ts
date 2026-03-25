import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { AuthStore } from '../../core/auth/auth.store';
import { UserProfileService } from '../../services/user-profile.service';
import { SettingsPageComponent } from './settings-page.component';

describe('SettingsPageComponent', () => {
  let fixture: ComponentFixture<SettingsPageComponent>;
  let userProfileService: {
    getCurrentProfile: ReturnType<typeof vi.fn>;
    updateCurrentProfile: ReturnType<typeof vi.fn>;
    changePassword: ReturnType<typeof vi.fn>;
  };
  let authStore: {
    setCurrentUser: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    userProfileService = {
      getCurrentProfile: vi.fn(),
      updateCurrentProfile: vi.fn(),
      changePassword: vi.fn(),
    };
    authStore = {
      setCurrentUser: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [SettingsPageComponent],
      providers: [
        {
          provide: UserProfileService,
          useValue: userProfileService,
        },
        {
          provide: AuthStore,
          useValue: authStore,
        },
      ],
    }).compileComponents();
  });

  it('loads the current profile into the form', () => {
    userProfileService.getCurrentProfile.mockReturnValue(
      of({
        id: 'user-123',
        name: 'Alex Nurse',
        email: 'alex@example.com',
        createdAt: '2026-03-24T00:00:00Z',
      }),
    );

    fixture = TestBed.createComponent(SettingsPageComponent);
    fixture.detectChanges();

    const component = fixture.componentInstance;

    expect(component.profileForm.getRawValue()).toEqual({
      name: 'Alex Nurse',
      email: 'alex@example.com',
    });
    expect(authStore.setCurrentUser).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Alex Nurse',
        email: 'alex@example.com',
      }),
    );
  });

  it('saves trimmed profile changes and shows success feedback', () => {
    userProfileService.getCurrentProfile.mockReturnValue(
      of({
        id: 'user-123',
        name: 'Alex Nurse',
        email: 'alex@example.com',
        createdAt: '2026-03-24T00:00:00Z',
      }),
    );
    userProfileService.updateCurrentProfile.mockReturnValue(
      of({
        id: 'user-123',
        name: 'Alex Carter',
        email: 'alex.carter@example.com',
        createdAt: '2026-03-24T00:00:00Z',
      }),
    );

    fixture = TestBed.createComponent(SettingsPageComponent);
    fixture.detectChanges();

    const component = fixture.componentInstance;
    component.profileForm.setValue({
      name: '  Alex Carter  ',
      email: '  Alex.Carter@example.com ',
    });

    component.saveProfile();

    expect(userProfileService.updateCurrentProfile).toHaveBeenCalledWith({
      name: 'Alex Carter',
      email: 'Alex.Carter@example.com',
    });
    expect(component.profileSuccessMessage()).toBe('Profile updated');
    expect(authStore.setCurrentUser).toHaveBeenLastCalledWith(
      expect.objectContaining({
        name: 'Alex Carter',
        email: 'alex.carter@example.com',
      }),
    );
  });

  it('shows a friendly backend error when save fails', () => {
    userProfileService.getCurrentProfile.mockReturnValue(
      of({
        id: 'user-123',
        name: 'Alex Nurse',
        email: 'alex@example.com',
        createdAt: '2026-03-24T00:00:00Z',
      }),
    );
    userProfileService.updateCurrentProfile.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 409,
            error: { message: 'Email is already in use.' },
          }),
      ),
    );

    fixture = TestBed.createComponent(SettingsPageComponent);
    fixture.detectChanges();

    const component = fixture.componentInstance;
    component.profileForm.setValue({
      name: 'Alex Nurse',
      email: 'taken@example.com',
    });

    component.saveProfile();

    expect(component.profileSaveError()).toBe('Email is already in use.');
  });

  it('opens, submits, and resets the password dialog on success', () => {
    userProfileService.getCurrentProfile.mockReturnValue(
      of({
        id: 'user-123',
        name: 'Alex Nurse',
        email: 'alex@example.com',
        createdAt: '2026-03-24T00:00:00Z',
      }),
    );
    userProfileService.changePassword.mockReturnValue(of(void 0));

    fixture = TestBed.createComponent(SettingsPageComponent);
    fixture.detectChanges();

    const component = fixture.componentInstance;
    component.openPasswordDialog();
    component.passwordForm.setValue({
      currentPassword: 'secret123',
      newPassword: 'updatedSecret123',
      confirmPassword: 'updatedSecret123',
    });

    component.updatePassword();

    expect(userProfileService.changePassword).toHaveBeenCalledWith({
      currentPassword: 'secret123',
      newPassword: 'updatedSecret123',
    });
    expect(component.passwordSuccessMessage()).toBe('Password updated');
    expect(component.isPasswordDialogOpen()).toBe(false);
    expect(component.passwordForm.getRawValue()).toEqual({
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    });
  });

  it('shows password form validation errors for mismatch and same-password rules', () => {
    userProfileService.getCurrentProfile.mockReturnValue(
      of({
        id: 'user-123',
        name: 'Alex Nurse',
        email: 'alex@example.com',
        createdAt: '2026-03-24T00:00:00Z',
      }),
    );

    fixture = TestBed.createComponent(SettingsPageComponent);
    fixture.detectChanges();

    const component = fixture.componentInstance;
    component.openPasswordDialog();
    component.passwordForm.setValue({
      currentPassword: 'secret123',
      newPassword: 'secret123',
      confirmPassword: 'different123',
    });
    component.passwordForm.controls.newPassword.markAsTouched();
    component.passwordForm.controls.confirmPassword.markAsTouched();

    expect(component.getPasswordFieldError('newPassword')).toBe(
      'New password must be different from your current password.',
    );
    expect(component.getPasswordFieldError('confirmPassword')).toBe(
      'Confirm password must match the new password.',
    );
  });

  it('shows a friendly backend error when password update fails', () => {
    userProfileService.getCurrentProfile.mockReturnValue(
      of({
        id: 'user-123',
        name: 'Alex Nurse',
        email: 'alex@example.com',
        createdAt: '2026-03-24T00:00:00Z',
      }),
    );
    userProfileService.changePassword.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 400,
            error: { message: 'Current password is incorrect.' },
          }),
      ),
    );

    fixture = TestBed.createComponent(SettingsPageComponent);
    fixture.detectChanges();

    const component = fixture.componentInstance;
    component.openPasswordDialog();
    component.passwordForm.setValue({
      currentPassword: 'wrong-password',
      newPassword: 'updatedSecret123',
      confirmPassword: 'updatedSecret123',
    });

    component.updatePassword();

    expect(component.passwordError()).toBe('Current password is incorrect.');
    expect(component.isPasswordDialogOpen()).toBe(true);
  });
});
