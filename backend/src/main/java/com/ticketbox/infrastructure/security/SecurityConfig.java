package com.ticketbox.infrastructure.security;

import com.fasterxml.jackson.databind.ObjectMapper;
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
                .requestMatchers("/api/health", "/actuator/health").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/auth/register", "/api/auth/login").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/concerts", "/api/concerts/**").permitAll()
                .requestMatchers("/api/payments/webhooks/**").permitAll()
                .requestMatchers("/api/mock-payments/**").permitAll()
                .requestMatchers("/api/admin/users", "/api/admin/users/**").hasRole("ADMIN")
                .requestMatchers("/api/admin/**").hasAnyRole("ADMIN", "ORGANIZER")
                .requestMatchers(HttpMethod.GET, "/api/staff/concerts/*/checkins").hasAnyRole("STAFF", "ORGANIZER", "ADMIN")
                .requestMatchers("/api/staff/**").hasRole("STAFF")
                .requestMatchers("/api/orders/**").hasRole("AUDIENCE")
                .requestMatchers("/api/tickets/**").hasRole("AUDIENCE")
                .requestMatchers("/api/payments/**").hasRole("AUDIENCE")
                .anyRequest().authenticated()
            )
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}
