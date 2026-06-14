package com.ticketbox.module.auth.web;

import com.ticketbox.module.auth.application.AuthService;
import com.ticketbox.module.auth.web.dto.AuthResponse;
import com.ticketbox.module.auth.web.dto.CurrentUserResponse;
import com.ticketbox.module.auth.web.dto.LoginRequest;
import com.ticketbox.module.auth.web.dto.RegisterRequest;
import com.ticketbox.shared.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<AuthResponse.UserSummary>> register(
            @Valid @RequestBody RegisterRequest request
    ) {
        AuthResponse.UserSummary userSummary = authService.register(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.created(userSummary));
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthResponse>> login(
            @Valid @RequestBody LoginRequest request
    ) {
        AuthResponse response = authService.login(request);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<CurrentUserResponse>> me(Authentication authentication) {
        // JwtAuthenticationFilter sets principal as userId (String).
        // We extract it here and load the user from DB — no ClassCastException risk.
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        UUID userId = UUID.fromString((String) authentication.getPrincipal());
        CurrentUserResponse response = authService.getCurrentUser(userId);
        return ResponseEntity.ok(ApiResponse.success(response));
    }
}
