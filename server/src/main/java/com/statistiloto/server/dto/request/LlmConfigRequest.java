package com.statistiloto.server.dto.request;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;

/** Request to update the global LLM configuration (admin only). */
public record LlmConfigRequest(
    @NotBlank String provider,
    @NotBlank String model,
    @JsonProperty("base_url") @JsonAlias("baseUrl") String baseUrl,
    @JsonProperty("api_key") @JsonAlias("apiKey") String apiKey,
    @JsonProperty("request_timeout_seconds") @JsonAlias("requestTimeoutSeconds") Integer requestTimeoutSeconds
) {}
