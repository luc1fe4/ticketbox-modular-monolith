package com.ticketbox.infrastructure.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ticketbox.shared.response.ApiResponse;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

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
            .cors(Customizer.withDefaults())
            .csrf(AbstractHttpConfigurer::disable)
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .exceptionHandling(exceptions -> exceptions
                .authenticationEntryPoint((request, response, authException) -> {
                    response.setContentType("application/json");
                    response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                    ApiResponse<Void> error = ApiResponse.error(HttpServletResponse.SC_UNAUTHORIZED, "Authentication required");
                    response.getWriter().write(objectMapper.writeValueAsString(error));
                })
                .accessDeniedHandler((request, response, accessDeniedException) -> {
                    response.setContentType("application/json");
                    response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                    ApiResponse<Void> error = ApiResponse.error(HttpServletResponse.SC_FORBIDDEN, "Access denied");
                    response.getWriter().write(objectMapper.writeValueAsString(error));
                })
            )
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/health", "/actuator/health").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/auth/register", "/api/auth/login").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/concerts", "/api/concerts/**").permitAll()
                .requestMatchers("/api/payments/webhooks/**").permitAll()
                .requestMatchers("/api/admin/users", "/api/admin/users/**").hasRole("ADMIN")
                .requestMatchers("/api/admin/**").hasAnyRole("ADMIN", "ORGANIZER")
                .requestMatchers("/api/organizer/**").hasRole("ORGANIZER")
                .requestMatchers("/api/queue/**").hasRole("AUDIENCE")
                .requestMatchers(HttpMethod.GET, "/api/staff/concerts/*/checkins").hasAnyRole("STAFF", "ORGANIZER", "ADMIN")
                .requestMatchers("/api/staff/**").hasRole("STAFF")
                .requestMatchers("/api/reservations/**").hasRole("AUDIENCE")
                .requestMatchers("/api/orders/**").hasRole("AUDIENCE")
                .requestMatchers("/api/tickets/**").hasRole("AUDIENCE")
                .requestMatchers("/api/mock-payments/**").hasRole("AUDIENCE")
                .requestMatchers("/api/payments/**").hasRole("AUDIENCE")
                .anyRequest().authenticated()
            )
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(List.of(
                "http://localhost:5173",
                "http://localhost:8081",
                "http://127.0.0.1:5173",
                "http://127.0.0.1:8081"
        ));
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("Authorization", "Content-Type", "Idempotency-Key", "Queue-Access-Token"));
        configuration.setExposedHeaders(List.of("Content-Disposition"));
        configuration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", configuration);
        return source;
    }
}
