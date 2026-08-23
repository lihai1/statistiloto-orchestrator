package com.statistiloto.server.dto.response;

/**
 * Current LLM configuration.
 *
 * <p>Fields {@code base_url} and {@code api_key} are included so the admin
 * UI can pre-populate the config form from the agent's current settings.
 * They are mapped from the Python agent's snake_case JSON via Jackson
 * {@code @JsonProperty} annotations.
 */
public record LlmConfigResponse(
    String provider,
    String model,
    @com.fasterxml.jackson.annotation.JsonProperty("base_url") String baseUrl,
    @com.fasterxml.jackson.annotation.JsonProperty("api_key") String apiKey,
    @com.fasterxml.jackson.annotation.JsonProperty("request_timeout_seconds") Integer requestTimeoutSeconds,
    String status,
    String note
) {}
