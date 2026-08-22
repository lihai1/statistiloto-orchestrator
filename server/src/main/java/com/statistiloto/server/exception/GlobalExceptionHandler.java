package com.statistiloto.server.exception;

import io.grpc.StatusRuntimeException;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.stream.Collectors;

/**
 * Consistent structured error responses across all controllers.
 *
 * <p>Every exception produces an {@link ErrorResponse} JSON body with:
 * <ul>
 *   <li>{@code error} — machine-readable code</li>
 *   <li>{@code message} — human-readable description</li>
 *   <li>{@code status} — HTTP status code</li>
 *   <li>{@code timestamp} — ISO-8601 instant</li>
 *   <li>{@code path} — request path</li>
 * </ul>
 *
 * <p>Logging:
 * <ul>
 *   <li>4xx client errors → WARN with context</li>
 *   <li>5xx server errors → ERROR with stack trace</li>
 * </ul>
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ErrorResponse> handleBadRequest(IllegalArgumentException e, HttpServletRequest req) {
        log.warn("Bad request on {} {}: {}", req.getMethod(), req.getRequestURI(), e.getMessage());
        return ResponseEntity.badRequest().body(
            new ErrorResponse("BAD_REQUEST", e.getMessage(), 400, req.getRequestURI()));
    }

    @ExceptionHandler(SecurityException.class)
    public ResponseEntity<ErrorResponse> handleForbidden(SecurityException e, HttpServletRequest req) {
        log.warn("Forbidden access on {} {}: {}", req.getMethod(), req.getRequestURI(), e.getMessage());
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(
            new ErrorResponse("FORBIDDEN", e.getMessage(), 403, req.getRequestURI()));
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ErrorResponse> handleAccessDenied(AccessDeniedException e, HttpServletRequest req) {
        log.warn("Access denied on {} {}: {}", req.getMethod(), req.getRequestURI(), e.getMessage());
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(
            new ErrorResponse("ACCESS_DENIED", "You do not have permission to perform this action", 403, req.getRequestURI()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidation(MethodArgumentNotValidException e, HttpServletRequest req) {
        String details = e.getBindingResult().getFieldErrors().stream()
            .map(fe -> fe.getField() + ": " + fe.getDefaultMessage())
            .collect(Collectors.joining("; "));
        log.warn("Validation failed on {} {}: {}", req.getMethod(), req.getRequestURI(), details);
        return ResponseEntity.badRequest().body(
            new ErrorResponse("VALIDATION_FAILED", details, 400, req.getRequestURI()));
    }

    @ExceptionHandler(StatusRuntimeException.class)
    public ResponseEntity<ErrorResponse> handleGrpcError(StatusRuntimeException e, HttpServletRequest req) {
        HttpStatus status = switch (e.getStatus().getCode()) {
            case INVALID_ARGUMENT, FAILED_PRECONDITION, OUT_OF_RANGE -> HttpStatus.BAD_REQUEST;
            case NOT_FOUND -> HttpStatus.NOT_FOUND;
            case PERMISSION_DENIED -> HttpStatus.FORBIDDEN;
            case UNAVAILABLE -> HttpStatus.SERVICE_UNAVAILABLE;
            case DEADLINE_EXCEEDED -> HttpStatus.GATEWAY_TIMEOUT;
            default -> HttpStatus.INTERNAL_SERVER_ERROR;
        };
        log.error("gRPC error on {} {}: status={} description={}",
            req.getMethod(), req.getRequestURI(),
            e.getStatus().getCode(), e.getStatus().getDescription(), e);
        return ResponseEntity.status(status).body(
            new ErrorResponse(
                "GRPC_" + e.getStatus().getCode().name(),
                "Lottery service error: " + e.getStatus().getDescription(),
                status.value(),
                req.getRequestURI()));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGeneric(Exception e, HttpServletRequest req) {
        log.error("Unhandled error on {} {}: {}", req.getMethod(), req.getRequestURI(), e.getMessage(), e);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(
            new ErrorResponse("INTERNAL_ERROR", "An unexpected error occurred", 500, req.getRequestURI()));
    }
}
