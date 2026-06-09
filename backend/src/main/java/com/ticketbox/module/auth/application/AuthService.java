package com.ticketbox.module.auth.application;

import com.ticketbox.module.auth.domain.User;
import com.ticketbox.module.auth.domain.UserRepository;
import com.ticketbox.module.auth.infrastructure.JwtService;
import com.ticketbox.module.auth.web.AuthResponse;
import com.ticketbox.module.auth.web.LoginRequest;
import com.ticketbox.module.auth.web.RegisterRequest;
import com.ticketbox.shared.exception.AppException;
import com.ticketbox.shared.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    @Transactional
    public AuthResponse.UserSummary register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.email())) {
            throw new AppException(ErrorCode.EMAIL_ALREADY_EXISTS, "Email is already registered");
        }

        User user = new User();
        user.setEmail(request.email());
        user.setFullName(request.fullName());
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setPhone(request.phone());
        user.setRole(User.Role.AUDIENCE); // Public registration defaults to AUDIENCE
        user.setActive(true);

        User savedUser = userRepository.save(user);

        return new AuthResponse.UserSummary(
                savedUser.getId(),
                savedUser.getEmail(),
                savedUser.getFullName(),
                savedUser.getRole()
        );
    }

    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.email())
                .orElseThrow(() -> new AppException(ErrorCode.UNAUTHENTICATED, "Invalid email or password"));

        if (!user.isActive()) {
            throw new AppException(ErrorCode.UNAUTHENTICATED, "User account is deactivated");
        }

        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new AppException(ErrorCode.UNAUTHENTICATED, "Invalid email or password");
        }

        String token = jwtService.generateToken(user);
        long expiresIn = jwtService.getExpirationMs() / 1000; // in seconds

        AuthResponse.UserSummary userSummary = new AuthResponse.UserSummary(
                user.getId(),
                user.getEmail(),
                user.getFullName(),
                user.getRole()
        );

        return new AuthResponse(token, "Bearer", expiresIn, userSummary);
    }
}
