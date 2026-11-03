import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '../../core/api/api-error';
import { usersApi } from '../../core/api/users-api';
import { useSession } from '../../core/auth/session-context';
import { queryKeys } from '../../core/query/query-keys';
import type { ChangePasswordRequest, UpdateProfileRequest, UserProfileResponse } from '../../lib/dto/users';

export function useProfile() {
  return useQuery({
    queryKey: queryKeys.profile(),
    queryFn: ({ signal }) => usersApi.getProfile({ signal }),
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const session = useSession();

  return useMutation<UserProfileResponse, Error, UpdateProfileRequest>({
    mutationFn: async (payload) => {
      const guard = session.captureSession();
      if (!guard.isCurrent()) {
        throw new DOMException('Session changed', 'AbortError');
      }
      const updated = await usersApi.updateProfile(payload);
      if (!guard.isCurrent()) {
        throw new DOMException('Session changed', 'AbortError');
      }
      return updated;
    },
    onSuccess: (updatedProfile) => {
      queryClient.setQueryData(queryKeys.profile(), updatedProfile);
      session.updateUser(updatedProfile);
    },
  });
}

export function useChangePassword() {
  const session = useSession();

  return useMutation<void, Error, ChangePasswordRequest>({
    mutationFn: async (payload) => {
      const guard = session.captureSession();
      if (!guard.isCurrent()) {
        throw new DOMException('Session changed', 'AbortError');
      }
      await usersApi.changePassword(payload);
      if (guard.isCurrent()) session.logout();
    },
  });
}

export function getSettingsErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError && error.message) {
    return error.message;
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}
