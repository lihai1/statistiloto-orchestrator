package com.statistiloto.server.dto.response;

import java.util.List;

/** The authenticated user's profile. */
public record UserProfileResponse(
    String sub,
    String email,
    String displayName,
    List<String> roles
) {}
