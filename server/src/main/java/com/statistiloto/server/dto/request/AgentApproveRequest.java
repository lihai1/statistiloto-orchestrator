package com.statistiloto.server.dto.request;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/** Request to approve or reject a paused agent action. */
public record AgentApproveRequest(
    @NotBlank @JsonProperty("session_id") @JsonAlias("sessionId") String sessionId,
    @NotNull Boolean approved,
    String edited
) {}
