package com.statistiloto.server.controller;

import com.statistiloto.server.dto.response.UserProfileResponse;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/** Returns the authenticated user's profile from the JWT claims. */
@RestController
@RequestMapping("/api")
public class UserController {

    @GetMapping("/me")
    public UserProfileResponse me(@AuthenticationPrincipal Jwt jwt) {
        List<String> roles = extractRoles(jwt);
        String email = jwt.getClaimAsString("email");
        String name = jwt.getClaimAsString("name");
        if (name == null) {
            name = jwt.getClaimAsString("preferred_username");
        }
        return new UserProfileResponse(jwt.getSubject(), email, name, roles);
    }

    /**
     * Stateless JWT verification endpoint used by Traefik's ForwardAuth
     * middleware for edge validation. Returns 200 if the token is valid
     * (Spring Security already validated it); 401 otherwise.
     */
    @GetMapping("/auth/verify")
    public Map<String, Object> verify(@AuthenticationPrincipal Jwt jwt) {
        if (jwt == null) {
            return Map.of("authenticated", false);
        }
        return Map.of(
            "authenticated", true,
            "sub", jwt.getSubject(),
            "email", jwt.getClaimAsString("email")
        );
    }

    @SuppressWarnings("unchecked")
    private List<String> extractRoles(Jwt jwt) {
        var realmAccess = jwt.getClaimAsMap("realm_access");
        if (realmAccess instanceof Map<?, ?> map) {
            Object roles = map.get("roles");
            if (roles instanceof List<?> list) {
                return (List<String>) list;
            }
        }
        return List.of();
    }
}
