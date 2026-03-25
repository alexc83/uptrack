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
  };
  let authStore: {
    setCurrentUser: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    userProfileService = {
      getCurrentProfile: vi.fn(),
      updateCurrentProfile: vi.fn(),
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
    expect(component.successMessage()).toBe('Profile updated');
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

    expect(component.saveError()).toBe('Email is already in use.');
  });
});
