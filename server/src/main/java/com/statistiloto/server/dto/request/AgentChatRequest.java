package com.statistiloto.server.dto.request;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;

/** Request to send a message to the AI agent. */
public record AgentChatRequest(
    @NotBlank @JsonProperty("session_id") @JsonAlias("sessionId") String sessionId,
    @NotBlank String message,
    String intent
) {}
