package com.statistiloto.server.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;

/**
 * Stateless security configuration.
 *
 * <p>Validates Keycloak-issued JWTs (RS256) via Spring Security's OAuth2
 * Resource Server. The {@code /api/auth/verify} endpoint is public — it is
 * used by Traefik's ForwardAuth middleware for edge JWT validation and
 * performs the validation itself. All other {@code /api/**} endpoints require
 * authentication.
 */
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                // Edge JWT verification endpoint (called by Traefik ForwardAuth).
                .requestMatchers("/api/auth/verify").permitAll()
                // Health and OpenAPI.
                .requestMatchers("/actuator/health", "/actuator/info").permitAll()
                .requestMatchers("/api-docs", "/swagger-ui/**", "/swagger-ui.html", "/v3/api-docs/**").permitAll()
                // All other API endpoints require a valid JWT.
                .requestMatchers("/api/**").authenticated()
                .anyRequest().authenticated()
            )
            .oauth2ResourceServer(oauth2 -> oauth2.jwt(jwt -> {}));
        return http.build();
    }
}
