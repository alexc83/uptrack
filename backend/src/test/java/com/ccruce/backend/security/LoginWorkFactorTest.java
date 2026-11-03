package com.ccruce.backend.security;

import com.ccruce.backend.dto.request.AuthLoginRequestDto;
import com.ccruce.backend.entity.User;
import com.ccruce.backend.exception.UnauthorizedException;
import com.ccruce.backend.repository.UserRepository;
import com.ccruce.backend.service.impl.AuthServiceImpl;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.password.PasswordEncoder;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class LoginWorkFactorTest {
    @Test
    void unknownAndKnownEmailsBothPerformOnePasswordVerification() {
        var users = mock(UserRepository.class);
        var encoder = mock(PasswordEncoder.class);
        when(encoder.encode(anyString())).thenReturn("dummy-hash");
        var service = new AuthServiceImpl(users, encoder, mock(JwtService.class));
        var request = new AuthLoginRequestDto("missing@example.test", "wrong-password");
        when(users.findByEmail(anyString())).thenReturn(Optional.empty());
        assertThrows(UnauthorizedException.class, () -> service.login(request));
        verify(encoder).matches("wrong-password", "dummy-hash");
        var user = new User();
        user.setPassword("real-hash");
        when(users.findByEmail(anyString())).thenReturn(Optional.of(user));
        assertThrows(UnauthorizedException.class, () -> service.login(request));
        verify(encoder).matches("wrong-password", "real-hash");
        // Assert the expensive operation, rather than a fragile wall-clock timing ratio.
        verify(encoder, times(2)).matches(eq("wrong-password"), anyString());
    }
}
