import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../core/api/api-error';
import { usersApi } from '../../core/api/users-api';
import { queryKeys } from '../../core/query/query-keys';
import type { UserProfileResponse } from '../../lib/dto/users';
import { getSettingsErrorMessage, useChangePassword, useUpdateProfile } from './use-settings';

// Session control: tests decide when the captured session stops being current.
const session = vi.hoisted(() => ({
  current: true,
  updateUser: vi.fn(),
  logout: vi.fn(),
}));
vi.mock('../../core/auth/session-context', () => ({
  useSession: () => ({
    captureSession: () => ({ isCurrent: () => session.current }),
    updateUser: session.updateUser,
    logout: session.logout,
  }),
}));

const profile: UserProfileResponse = {
  id: '00000000-0000-4000-8000-000000000001',
  name: 'Alex Carter',
  email: 'alex@example.com',
  createdAt: '2026-03-24T00:00:00Z',
};
const profileRequest = { name: 'Alex Carter', email: 'alex@example.com' };
const passwordRequest = { currentPassword: 'old-password-1', newPassword: 'new-password-1' };

function setup() {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { queryClient, wrapper };
}

describe('useUpdateProfile', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    session.current = true;
    session.updateUser.mockReset();
    session.logout.mockReset();
  });

  it('writes the cache and session user on success', async () => {
    vi.spyOn(usersApi, 'updateProfile').mockResolvedValue(profile);
    const { queryClient, wrapper } = setup();
    const { result } = renderHook(() => useUpdateProfile(), { wrapper });

    await act(() => result.current.mutateAsync(profileRequest));

    expect(queryClient.getQueryData(queryKeys.profile())).toEqual(profile);
    expect(session.updateUser).toHaveBeenCalledWith(profile);
  });

  it('aborts before calling the API when the session is already replaced', async () => {
    const update = vi.spyOn(usersApi, 'updateProfile').mockResolvedValue(profile);
    session.current = false;
    const { queryClient, wrapper } = setup();
    const { result } = renderHook(() => useUpdateProfile(), { wrapper });

    await act(async () => {
      await expect(result.current.mutateAsync(profileRequest)).rejects.toMatchObject({ name: 'AbortError' });
    });

    expect(update).not.toHaveBeenCalled();
    expect(queryClient.getQueryData(queryKeys.profile())).toBeUndefined();
    expect(session.updateUser).not.toHaveBeenCalled();
  });

  it('discards the response and never writes cache or session when the session is replaced mid-request', async () => {
    vi.spyOn(usersApi, 'updateProfile').mockImplementation(async () => {
      session.current = false; // replaced while the request is in flight
      return profile;
    });
    const { queryClient, wrapper } = setup();
    const { result } = renderHook(() => useUpdateProfile(), { wrapper });

    await act(async () => {
      await expect(result.current.mutateAsync(profileRequest)).rejects.toMatchObject({ name: 'AbortError' });
    });

    expect(queryClient.getQueryData(queryKeys.profile())).toBeUndefined();
    expect(session.updateUser).not.toHaveBeenCalled();
  });

  it('surfaces API failures without touching cache or session', async () => {
    vi.spyOn(usersApi, 'updateProfile').mockRejectedValue(new ApiError('http', 409, 'Email is already in use.'));
    const { queryClient, wrapper } = setup();
    const { result } = renderHook(() => useUpdateProfile(), { wrapper });

    await act(async () => {
      await expect(result.current.mutateAsync(profileRequest)).rejects.toThrow('Email is already in use.');
    });
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(queryClient.getQueryData(queryKeys.profile())).toBeUndefined();
    expect(session.updateUser).not.toHaveBeenCalled();
  });
});

describe('useChangePassword', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    session.current = true;
    session.updateUser.mockReset();
    session.logout.mockReset();
  });

  it('signs the session out after a successful change', async () => {
    const change = vi.spyOn(usersApi, 'changePassword').mockResolvedValue(undefined);
    const { wrapper } = setup();
    const { result } = renderHook(() => useChangePassword(), { wrapper });

    await act(() => result.current.mutateAsync(passwordRequest));

    expect(change).toHaveBeenCalledWith(passwordRequest);
    expect(session.logout).toHaveBeenCalledTimes(1);
  });

  it('aborts before calling the API when the session is already replaced', async () => {
    const change = vi.spyOn(usersApi, 'changePassword').mockResolvedValue(undefined);
    session.current = false;
    const { wrapper } = setup();
    const { result } = renderHook(() => useChangePassword(), { wrapper });

    await act(async () => {
      await expect(result.current.mutateAsync(passwordRequest)).rejects.toMatchObject({ name: 'AbortError' });
    });

    expect(change).not.toHaveBeenCalled();
    expect(session.logout).not.toHaveBeenCalled();
  });

  it('does not log out a replacement session when the session changed during the request', async () => {
    vi.spyOn(usersApi, 'changePassword').mockImplementation(async () => {
      session.current = false;
    });
    const { wrapper } = setup();
    const { result } = renderHook(() => useChangePassword(), { wrapper });

    await act(() => result.current.mutateAsync(passwordRequest));

    expect(session.logout).not.toHaveBeenCalled();
  });

  it('does not log out when the API rejects the change', async () => {
    vi.spyOn(usersApi, 'changePassword').mockRejectedValue(new ApiError('http', 400, 'Current password is incorrect.'));
    const { wrapper } = setup();
    const { result } = renderHook(() => useChangePassword(), { wrapper });

    await act(async () => {
      await expect(result.current.mutateAsync(passwordRequest)).rejects.toThrow('Current password is incorrect.');
    });

    expect(session.logout).not.toHaveBeenCalled();
  });
});

describe('getSettingsErrorMessage', () => {
  it('prefers the ApiError message', () => {
    expect(getSettingsErrorMessage(new ApiError('http', 409, 'The account changed.'), 'fallback')).toBe('The account changed.');
  });

  it('uses a plain Error message', () => {
    expect(getSettingsErrorMessage(new Error('Network down'), 'fallback')).toBe('Network down');
  });

  it('falls back when the error has an empty message', () => {
    expect(getSettingsErrorMessage(new Error(''), 'fallback')).toBe('fallback');
    expect(getSettingsErrorMessage(new ApiError('http', 500, ''), 'fallback')).toBe('fallback');
  });

  it('falls back for non-Error values', () => {
    expect(getSettingsErrorMessage('boom', 'fallback')).toBe('fallback');
    expect(getSettingsErrorMessage(undefined, 'fallback')).toBe('fallback');
    expect(getSettingsErrorMessage({ message: 'not an Error' }, 'fallback')).toBe('fallback');
  });
});
