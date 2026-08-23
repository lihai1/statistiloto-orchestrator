package com.statistiloto.server.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.convert.converter.Converter;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.oauth2.server.resource.authentication.JwtGrantedAuthoritiesConverter;
import org.springframework.security.web.SecurityFilterChain;

import java.util.*;
import java.util.stream.Collectors;
import java.util.stream.Stream;

/**
 * Stateless security configuration.
 *
 * <p>Validates Keycloak-issued JWTs (RS256) via Spring Security's OAuth2
 * Resource Server. Extracts realm roles from the {@code realm_access.roles}
 * claim and maps them to {@code ROLE_<name>} authorities for {@code @PreAuthorize}.
 *
 * <p>The {@code /api/auth/verify} endpoint is public — it is used by Traefik's
 * ForwardAuth middleware for edge JWT validation. All other {@code /api/**}
 * endpoints require authentication.
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
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
            .oauth2ResourceServer(oauth2 -> oauth2.jwt(jwt -> jwt
                .jwtAuthenticationConverter(keycloakAuthConverter())));
        return http.build();
    }

    /**
     * Converts Keycloak JWT claims into Spring Security authorities.
     *
     * <p>Extracts roles from both {@code realm_access.roles} and {@code groups}
     * claims. Each role is mapped to {@code ROLE_<ROLE_NAME>} (uppercased) so
     * that {@code @PreAuthorize("hasRole('ADMIN')")} works with Keycloak's
     * {@code ADMIN} realm role.
     */
    @Bean
    public Converter<Jwt, AbstractAuthenticationToken> keycloakAuthConverter() {
        JwtGrantedAuthoritiesConverter scopesConverter = new JwtGrantedAuthoritiesConverter();
        // Default: extract from "scope" claim as SCOPE_<name> authorities.

        JwtAuthenticationConverter jwtConverter = new JwtAuthenticationConverter();
        jwtConverter.setJwtGrantedAuthoritiesConverter(jwt -> {
            // 1. Standard scope-based authorities (SCOPE_openid, etc.)
            Collection<GrantedAuthority> authorities = new ArrayList<>(
                scopesConverter.convert(jwt));

            // 2. Realm roles from realm_access.roles → ROLE_<name>
            Map<String, Object> realmAccess = jwt.getClaim("realm_access");
            if (realmAccess != null && realmAccess.get("roles") instanceof List<?> roles) {
                for (Object role : roles) {
                    String roleName = String.valueOf(role).toUpperCase();
                    authorities.add(new SimpleGrantedAuthority("ROLE_" + roleName));
                }
            }

            // 3. Groups → ROLE_<group_name> (e.g. "/admins" → "ROLE_ADMINS")
            List<String> groups = jwt.getClaim("groups");
            if (groups != null) {
                for (String group : groups) {
                    // Strip leading slash: "/admins" → "admins"
                    String groupName = group.startsWith("/") ? group.substring(1) : group;
                    authorities.add(new SimpleGrantedAuthority("ROLE_" + groupName.toUpperCase()));
                }
            }

            return authorities;
        });
        return jwtConverter;
    }
}
