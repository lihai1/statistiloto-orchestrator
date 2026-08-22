package com.statistiloto.server.service;

import com.statistiloto.server.entity.UserProfile;
import com.statistiloto.server.repository.UserProfileRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Ensures a {@link UserProfile} row exists for an authenticated user.
 * Called on first login (via /api/me) and before any save operation
 * to satisfy the foreign key constraint on saved_numbers.user_sub.
 */
@Service
@Transactional
public class UserProfileService {

    private static final Logger log = LoggerFactory.getLogger(UserProfileService.class);

    private final UserProfileRepository repository;

    public UserProfileService(UserProfileRepository repository) {
        this.repository = repository;
    }

    /**
     * Ensure a user profile exists for the given subject. Creates one
     * if missing, updates the display name if it has changed.
     */
    public UserProfile ensureProfile(String sub, String displayName) {
        log.info("[ensureProfile] START sub={} name={}", sub, displayName);
        if (sub == null) {
            log.error("[ensureProfile] FAIL — sub is null");
            throw new IllegalArgumentException("User subject cannot be null");
        }
        try {
            return repository.findById(sub).orElseGet(() -> {
                log.info("[ensureProfile] Creating new profile for sub={}", sub);
                UserProfile profile = new UserProfile(sub, displayName);
                return repository.save(profile);
            });
        } catch (RuntimeException e) {
            log.error("[ensureProfile] ERROR sub={} msg={}", sub, e.getMessage(), e);
            throw e;
        }
    }
}
