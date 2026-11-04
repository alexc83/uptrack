package com.ccruce.backend.service;

import com.ccruce.backend.dto.request.ChangePasswordRequestDto;
import com.ccruce.backend.dto.request.UpdateProfileRequestDto;
import com.ccruce.backend.entity.User;
import com.ccruce.backend.exception.ConflictException;
import com.ccruce.backend.exception.UnauthorizedException;
import com.ccruce.backend.repository.UserRepository;
import com.ccruce.backend.security.AuthenticatedUser;
import com.ccruce.backend.service.impl.UserServiceImpl;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/**
 * Service-level coverage of the guarded-update 409 paths ("The account changed") and the unauthenticated guard.
 * The conditional UPDATE reporting 0 rows models a concurrent change to the account between read and write.
 */
class UserServiceImplTest {

    private final UserRepository repository = mock(UserRepository.class);
    private final PasswordEncoder encoder = mock(PasswordEncoder.class);
    private final UserServiceImpl service = new UserServiceImpl(repository, encoder);
    private final UUID id = UUID.randomUUID();
    private User user;

    @BeforeEach
    void authenticate() {
        user = new User();
        user.setId(id);
        user.setName("Alex");
        user.setEmail("alex@example.test");
        user.setPassword("stored-hash");
        when(repository.findById(id)).thenReturn(Optional.of(user));
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(
                new AuthenticatedUser(id, "alex@example.test", "Alex"), null, List.of()));
    }

    @AfterEach
    void clear() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void profileUpdateReturns409WhenGuardedUpdateAffectsNoRow() {
        when(repository.findByEmail(anyString())).thenReturn(Optional.empty());
        when(repository.updateProfile(any(), anyString(), anyString())).thenReturn(0);

        ConflictException thrown = assertThrows(ConflictException.class,
                () -> service.updateCurrentUserProfile(new UpdateProfileRequestDto("New Name", "New@Example.test")));

        assertEquals("The account changed. Please sign in again.", thrown.getMessage());
        verify(repository).updateProfile(id, "New Name", "new@example.test");
    }

    @Test
    void passwordChangeReturns409WhenStoredPasswordChangedConcurrently() {
        when(encoder.matches("old-password", "stored-hash")).thenReturn(true);
        when(encoder.encode("new-password-1")).thenReturn("new-hash");
        when(repository.changePassword(id, "stored-hash", "new-hash")).thenReturn(0);

        ConflictException thrown = assertThrows(ConflictException.class,
                () -> service.changeCurrentUserPassword(new ChangePasswordRequestDto("old-password", "new-password-1")));

        assertEquals("The account changed. Please sign in again.", thrown.getMessage());
    }

    @Test
    void passwordChangeSucceedsWhenGuardedUpdateAffectsOneRow() {
        when(encoder.matches("old-password", "stored-hash")).thenReturn(true);
        when(encoder.encode("new-password-1")).thenReturn("new-hash");
        when(repository.changePassword(id, "stored-hash", "new-hash")).thenReturn(1);

        service.changeCurrentUserPassword(new ChangePasswordRequestDto("old-password", "new-password-1"));

        verify(repository).changePassword(id, "stored-hash", "new-hash");
    }

    @Test
    void unauthenticatedCallsAreRejectedBeforeAnyRepositoryAccess() {
        SecurityContextHolder.clearContext();

        assertThrows(UnauthorizedException.class, service::getCurrentUserProfile);
        assertThrows(UnauthorizedException.class,
                () -> service.updateCurrentUserProfile(new UpdateProfileRequestDto("N", "n@example.test")));
        assertThrows(UnauthorizedException.class,
                () -> service.changeCurrentUserPassword(new ChangePasswordRequestDto("old-password", "new-password-1")));

        verifyNoInteractions(repository);
    }

    @Test
    void nonUserPrincipalIsTreatedAsUnauthenticated() {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("anonymousUser", null, List.of()));

        assertThrows(UnauthorizedException.class, service::getCurrentUserProfile);
        verify(repository, never()).findById(any());
    }
}
