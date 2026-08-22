package com.statistiloto.server.exception;

import java.time.Instant;

/**
 * Structured error response returned by all BFF endpoints on failure.
 *
 * @param error     short machine-readable error code (e.g. "BAD_REQUEST")
 * @param message   human-readable description
 * @param status    HTTP status code
 * @param timestamp ISO-8601 instant when the error occurred
 * @param path      request path that triggered the error
 */
public record ErrorResponse(
    String error,
    String message,
    int status,
    String timestamp,
    String path
) {
    public ErrorResponse(String error, String message, int status, String path) {
        this(error, message, status, Instant.now().toString(), path);
    }
}
