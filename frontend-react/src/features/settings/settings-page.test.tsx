import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { routes } from '../../app/router';
import { ApiError } from '../../core/api/api-error';
import { usersApi } from '../../core/api/users-api';
import type { UserProfileResponse } from '../../lib/dto/users';
import { renderWithProviders } from '../../test/render-with-providers';

const fixtureProfile: UserProfileResponse = {
  id: '00000000-0000-4000-8000-000000000001',
  name: 'Alex Nurse',
  email: 'alex@example.com',
  createdAt: '2026-03-24T00:00:00Z',
};

describe('SettingsPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(usersApi, 'getProfile').mockResolvedValue(structuredClone(fixtureProfile));
    vi.spyOn(usersApi, 'updateProfile').mockResolvedValue({
      ...fixtureProfile,
      name: 'Alex Carter',
      email: 'alex.carter@example.com',
    });
    vi.spyOn(usersApi, 'changePassword').mockResolvedValue(undefined);
  });

  it('sets document title and renders header with account kicker', async () => {
    renderWithProviders(null, { routes, path: '/settings', session: 'authenticated' });

    expect(await screen.findByRole('heading', { level: 1, name: 'Settings' })).toBeVisible();
    expect(screen.getByText('Account')).toBeVisible();
    expect(screen.getByText('Manage your account information.')).toBeVisible();
    expect(document.title).toBe('Settings — UpTrack');
  });

  it('loads the current profile into the form with Save Changes disabled initially', async () => {
    renderWithProviders(null, { routes, path: '/settings', session: 'authenticated' });

    const nameInput = await screen.findByLabelText(/^Name/);
    const emailInput = screen.getByLabelText(/^Email/);
    const saveButton = screen.getByRole('button', { name: 'Save Changes' });

    expect(nameInput).toHaveValue('Alex Nurse');
    expect(emailInput).toHaveValue('alex@example.com');
    expect(saveButton).toBeDisabled();
  });

  it('shows error state with retry button when profile loading fails', async () => {
    vi.spyOn(usersApi, 'getProfile')
      .mockRejectedValueOnce(new ApiError('http', 500, 'We could not load your profile right now.'))
      .mockResolvedValueOnce(structuredClone(fixtureProfile));

    const user = userEvent.setup();
    renderWithProviders(null, { routes, path: '/settings', session: 'authenticated' });

    expect(await screen.findByRole('heading', { name: 'Settings unavailable' })).toBeVisible();
    expect(screen.getByText('We could not load your profile right now.')).toBeVisible();

    const retryButton = screen.getByRole('button', { name: 'Retry' });
    await user.click(retryButton);

    expect(await screen.findByRole('heading', { level: 1, name: 'Settings' })).toBeVisible();
    expect(await screen.findByDisplayValue('Alex Nurse')).toBeVisible();
  });

  it('enables Save Changes on valid input change and submits trimmed payload', async () => {
    const user = userEvent.setup();
    const { store } = renderWithProviders(null, { routes, path: '/settings', session: 'authenticated' });

    const nameInput = await screen.findByLabelText(/^Name/);
    const saveButton = screen.getByRole('button', { name: 'Save Changes' });

    expect(saveButton).toBeDisabled();

    await user.clear(nameInput);
    await user.type(nameInput, '  Alex Carter  ');

    expect(saveButton).toBeEnabled();

    await user.click(saveButton);

    await waitFor(() => {
      expect(usersApi.updateProfile).toHaveBeenCalledWith({
        name: 'Alex Carter',
        email: 'alex@example.com',
      });
    });

    expect(await screen.findByText('Profile updated')).toBeVisible();
    expect(store.getSnapshot().user?.name).toBe('Alex Carter');
    expect(saveButton).toBeDisabled();
  });

  it('shows friendly backend error when profile save fails and preserves input', async () => {
    vi.spyOn(usersApi, 'updateProfile').mockRejectedValueOnce(
      new ApiError('http', 409, 'Email is already in use.'),
    );

    const user = userEvent.setup();
    renderWithProviders(null, { routes, path: '/settings', session: 'authenticated' });

    const emailInput = await screen.findByLabelText(/^Email/);
    const saveButton = screen.getByRole('button', { name: 'Save Changes' });

    await user.clear(emailInput);
    await user.type(emailInput, 'taken@example.com');
    await user.click(saveButton);

    expect(await screen.findByText('Email is already in use.')).toBeVisible();
    expect(emailInput).toHaveValue('taken@example.com');
  });

  it('validates required name and email format', async () => {
    const user = userEvent.setup();
    renderWithProviders(null, { routes, path: '/settings', session: 'authenticated' });

    const nameInput = await screen.findByLabelText(/^Name/);
    const emailInput = screen.getByLabelText(/^Email/);
    const saveButton = screen.getByRole('button', { name: 'Save Changes' });

    await user.clear(nameInput);
    fireEvent.blur(nameInput);

    expect(await screen.findByText('Name is required.')).toBeVisible();
    expect(saveButton).toBeDisabled();

    await user.type(nameInput, 'Alex');
    await user.clear(emailInput);
    await user.type(emailInput, 'invalid-email');
    fireEvent.blur(emailInput);

    expect(await screen.findByText('Enter a valid email address.')).toBeVisible();
    expect(saveButton).toBeDisabled();
  });

  it('opens and closes the password dialog via Cancel button', async () => {
    const user = userEvent.setup();
    renderWithProviders(null, { routes, path: '/settings', session: 'authenticated' });

    const changePasswordButton = await screen.findByRole('button', { name: 'Change Password' });
    await user.click(changePasswordButton);

    const dialog = await screen.findByRole('dialog', { name: 'Change Password' });
    expect(dialog).toBeVisible();
    expect(screen.getByText('Changing your password signs you out on all devices. Sign in again with your new password.')).toBeVisible();

    const cancelButton = screen.getByRole('button', { name: 'Cancel' });
    await user.click(cancelButton);

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Change Password' })).not.toBeInTheDocument();
    });
  });

  it('validates password fields: required, minlength, same password, mismatch', async () => {
    const user = userEvent.setup();
    renderWithProviders(null, { routes, path: '/settings', session: 'authenticated' });

    await user.click(await screen.findByRole('button', { name: 'Change Password' }));
    await screen.findByRole('dialog', { name: 'Change Password' });

    const currentInput = screen.getByLabelText(/^Current Password/);
    const newInput = screen.getByLabelText(/^New Password/);
    const confirmInput = screen.getByLabelText(/^Confirm New Password/);

    // Enter short new password
    await user.type(currentInput, 'secret123');
    await user.type(newInput, 'short');
    fireEvent.blur(newInput);
    expect(await screen.findByText('Password must be at least 8 characters.')).toBeVisible();

    // Enter same new password as current password
    await user.clear(newInput);
    await user.type(newInput, 'secret123');
    await user.type(confirmInput, 'secret123');
    fireEvent.blur(newInput);
    expect(await screen.findByText('New password must be different from your current password.')).toBeVisible();

    // Enter mismatched confirm password
    await user.clear(newInput);
    await user.type(newInput, 'newSecret123');
    await user.clear(confirmInput);
    await user.type(confirmInput, 'different123');
    fireEvent.blur(confirmInput);
    expect(await screen.findByText('Confirm password must match the new password.')).toBeVisible();
  });

  it('submits valid password change and signs out the initiating session', async () => {
    const user = userEvent.setup();
    const { store } = renderWithProviders(null, { routes, path: '/settings', session: 'authenticated' });

    await user.click(await screen.findByRole('button', { name: 'Change Password' }));
    await screen.findByRole('dialog', { name: 'Change Password' });

    const currentInput = screen.getByLabelText(/^Current Password/);
    const newInput = screen.getByLabelText(/^New Password/);
    const confirmInput = screen.getByLabelText(/^Confirm New Password/);

    await user.type(currentInput, 'oldPassword123');
    await user.type(newInput, 'newPassword456');
    await user.type(confirmInput, 'newPassword456');

    const updateButton = screen.getByRole('button', { name: 'Update Password' });
    expect(updateButton).toBeEnabled();

    await user.click(updateButton);

    await waitFor(() => {
      expect(usersApi.changePassword).toHaveBeenCalledWith({
        currentPassword: 'oldPassword123',
        newPassword: 'newPassword456',
      });
    });

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Change Password' })).not.toBeInTheDocument();
    });

    expect(store.getSnapshot().status).toBe('unauthenticated');
    expect(await screen.findByRole('heading', { level: 1, name: 'Track credentials. Stay compliant. Own your career.' })).toBeVisible();
  });

  it('shows server error when password update fails and keeps dialog open', async () => {
    vi.spyOn(usersApi, 'changePassword').mockRejectedValueOnce(
      new ApiError('http', 400, 'Current password is incorrect.'),
    );

    const user = userEvent.setup();
    renderWithProviders(null, { routes, path: '/settings', session: 'authenticated' });

    await user.click(await screen.findByRole('button', { name: 'Change Password' }));
    await screen.findByRole('dialog', { name: 'Change Password' });

    await user.type(screen.getByLabelText(/^Current Password/), 'wrongPassword123');
    await user.type(screen.getByLabelText(/^New Password/), 'newPassword456');
    await user.type(screen.getByLabelText(/^Confirm New Password/), 'newPassword456');

    await user.click(screen.getByRole('button', { name: 'Update Password' }));

    expect(await screen.findByText('Current password is incorrect.')).toBeVisible();
    expect(screen.getByRole('dialog', { name: 'Change Password' })).toBeVisible();
  });

  it('navigates back when clicking the Back button', async () => {
    const user = userEvent.setup();
    const { router } = renderWithProviders(null, { routes, path: '/dashboard', session: 'authenticated' });

    // Navigate to /settings with state: { from: '/dashboard' }
    await act(async () => {
      await router.navigate('/settings', { state: { from: '/dashboard' } });
    });

    const backButton = await screen.findByRole('button', { name: 'Back' });
    await user.click(backButton);

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/dashboard');
    });
  });

  it('remounts and clears uncommitted dialog and error state on session replacement', async () => {
    const user = userEvent.setup();
    const { store } = renderWithProviders(null, { routes, path: '/settings', session: 'authenticated' });

    await user.click(await screen.findByRole('button', { name: 'Change Password' }));
    expect(await screen.findByRole('dialog', { name: 'Change Password' })).toBeVisible();

    const currentInput = screen.getByLabelText(/^Current Password/);
    await user.type(currentInput, 'uncommittedDraft');

    // Simulate session replacement (e.g. login as different user)
    const newAccount: UserProfileResponse = {
      id: '00000000-0000-4000-8000-000000000099',
      name: 'Account B',
      email: 'account-b@example.com',
      createdAt: '2026-03-24T00:00:00Z',
    };
    vi.spyOn(usersApi, 'getProfile').mockResolvedValue(newAccount);

    await act(async () => {
      await store.login({ email: 'account-b@example.com', password: 'password123' });
    });

    // Modal dialog is closed and state reset
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Change Password' })).not.toBeInTheDocument();
    });
    expect(await screen.findByDisplayValue('Account B')).toBeVisible();
  });
});
