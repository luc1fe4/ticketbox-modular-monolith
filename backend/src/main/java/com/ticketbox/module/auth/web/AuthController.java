package com.ticketbox.module.auth.web;

import com.ticketbox.module.auth.application.AuthService;
import com.ticketbox.module.auth.domain.User;
import com.ticketbox.module.auth.web.dto.AuthResponse;
import com.ticketbox.module.auth.web.dto.CurrentUserResponse;
import com.ticketbox.module.auth.web.dto.LoginRequest;
import com.ticketbox.module.auth.web.dto.RegisterRequest;
import com.ticketbox.shared.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

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
    public ResponseEntity<ApiResponse<CurrentUserResponse>> me(
            @AuthenticationPrincipal User user
    ) {
        // If user is null (shouldn't happen on authenticated endpoints), return 401
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        CurrentUserResponse response = CurrentUserResponse.from(user);
        return ResponseEntity.ok(ApiResponse.success(response));
    }
}
