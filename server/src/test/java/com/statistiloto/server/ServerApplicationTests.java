package com.statistiloto.server;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.TestPropertySource;

/**
 * Smoke test: verifies the Spring context loads.
 * Uses H2 for the test profile to avoid requiring a live Postgres.
 */
@SpringBootTest
@TestPropertySource(properties = {
    "spring.datasource.url=jdbc:h2:mem:testdb;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE",
    "spring.datasource.driver-class-name=org.h2.Driver",
    "spring.datasource.username=sa",
    "spring.datasource.password=",
    "spring.jpa.hibernate.ddl-auto=create-drop",
    "spring.flyway.enabled=false",
    "spring.security.oauth2.resourceserver.jwt.jwk-set-uri=http://localhost/auth/realms/statistiloto/protocol/openid-connect/certs",
    "spring.security.oauth2.resourceserver.jwt.audiences=statistiloto-ui",
    "lottery.grpc.host=localhost",
    "lottery.grpc.port=9090"
})
class ServerApplicationTests {

    @Test
    void contextLoads() {
        // If the context fails to load, this test fails.
    }
}
