package com.statistiloto.server.controller;

import com.statistiloto.server.dto.response.UserProfileResponse;
import com.statistiloto.server.service.UserProfileService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
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

    private static final Logger log = LoggerFactory.getLogger(UserController.class);

    private final UserProfileService userProfileService;

    public UserController(UserProfileService userProfileService) {
        this.userProfileService = userProfileService;
    }

    @GetMapping("/me")
    public UserProfileResponse me(@AuthenticationPrincipal Jwt jwt) {
        log.info("[me] START jwt={}", jwt != null ? "present" : "null");
        if (jwt == null) {
            log.warn("[me] ERROR jwt is null — AuthenticationPrincipal not resolved");
            throw new IllegalStateException("JWT principal is null");
        }
        String sub = jwt.getSubject();
        List<String> roles = extractRoles(jwt);
        String email = jwt.getClaimAsString("email");
        String name = jwt.getClaimAsString("name");
        if (name == null) {
            name = jwt.getClaimAsString("preferred_username");
        }

        // Ensure a user_profile row exists (auto-create on first login).
        userProfileService.ensureProfile(sub, name);

        log.info("[me] SUCCESS sub={} email={} name={} roles={}", sub, email, name, roles);
        return new UserProfileResponse(sub, email, name, roles);
    }

    /**
     * Stateless JWT verification endpoint used by Traefik's ForwardAuth
     * middleware for edge validation. Returns 200 if the token is valid
     * (Spring Security already validated it); 401 otherwise.
     */
    @GetMapping("/auth/verify")
    public Map<String, Object> verify(@AuthenticationPrincipal Jwt jwt) {
        if (jwt == null) {
            log.warn("[verify] No JWT principal — returning unauthenticated");
            return Map.of("authenticated", false);
        }
        log.info("[verify] SUCCESS sub={} email={}", jwt.getSubject(), jwt.getClaimAsString("email"));
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
