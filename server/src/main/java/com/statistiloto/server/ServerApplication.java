package com.statistiloto.server;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * Statistiloto Java BFF (Backend-for-Frontend).
 *
 * <p>Owns user application data (saved numbers) in the {@code app} schema.
 * Calls the Go lottery-stats-server via gRPC for all algorithm work.
 * Validates Keycloak-issued JWTs via Spring Security OAuth2 Resource Server.
 */
@SpringBootApplication
public class ServerApplication {

    public static void main(String[] args) {
        SpringApplication.run(ServerApplication.class, args);
    }
}
