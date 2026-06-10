package com.ticketbox.infrastructure.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ticketbox.module.auth.infrastructure.JwtAuthenticationFilter;
import com.ticketbox.shared.response.ErrorResponse;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final ObjectMapper objectMapper;

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .csrf(AbstractHttpConfigurer::disable)
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .exceptionHandling(exceptions -> exceptions
                .authenticationEntryPoint((request, response, authException) -> {
                    response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                    response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                    ErrorResponse error = ErrorResponse.of(HttpServletResponse.SC_UNAUTHORIZED, "Authentication required");
                    objectMapper.writeValue(response.getOutputStream(), error);
                })
                .accessDeniedHandler((request, response, accessDeniedException) -> {
                    response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                    response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                    ErrorResponse error = ErrorResponse.of(HttpServletResponse.SC_FORBIDDEN, "Access denied");
                    objectMapper.writeValue(response.getOutputStream(), error);
                })
            )
            .authorizeHttpRequests(auth -> auth
                // Public health checks
                .requestMatchers("/api/health", "/actuator/health").permitAll()

                // Public auth endpoints
                .requestMatchers(HttpMethod.POST, "/api/auth/register", "/api/auth/login").permitAll()

                // Public concert information endpoints (method-specific GET)
                .requestMatchers(HttpMethod.GET, "/api/concerts", "/api/concerts/**").permitAll()

                // Public payment webhooks and mock payment endpoints
                .requestMatchers("/api/payments/webhooks/**").permitAll()
                .requestMatchers("/api/mock-payments/**").permitAll()

                // Specific Admin User management endpoint is ADMIN only
                .requestMatchers("/api/admin/users", "/api/admin/users/**").hasRole("ADMIN")

                // Other Admin endpoints are accessible by ADMIN or ORGANIZER
                .requestMatchers("/api/admin/**").hasAnyRole("ADMIN", "ORGANIZER")

                // Staff checkin list is accessible by STAFF, ORGANIZER, or ADMIN
                .requestMatchers(HttpMethod.GET, "/api/staff/concerts/*/checkins").hasAnyRole("STAFF", "ORGANIZER", "ADMIN")

                // Other Staff endpoints are STAFF only
                .requestMatchers("/api/staff/**").hasRole("STAFF")

                // Any other API request requires authentication
                .anyRequest().authenticated()
            )
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}
