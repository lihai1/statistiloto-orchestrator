plugins {
    java
    id("org.springframework.boot") version "3.5.3"
    id("io.spring.dependency-management") version "1.1.7"
    id("com.google.protobuf") version "0.9.4"
}

group = "com.statistiloto"
version = "0.0.1-SNAPSHOT"

java {
    toolchain {
        languageVersion = JavaLanguageVersion.of(21)
    }
}

repositories {
    mavenCentral()
}

// ── Protobuf source set: shared proto at repo root ──────────────────
protobuf {
    protoc {
        artifact = "com.google.protobuf:protoc:3.25.5"
    }
    plugins {
        create("grpc") {
            artifact = "io.grpc:protoc-gen-grpc-java:1.68.2"
        }
    }
    generateProtoTasks {
        all().forEach {
            it.plugins {
                create("grpc")
            }
        }
    }
}

// Point the proto source at the shared repo-root proto/ directory.
// Exclude third_party — the google/api protos are provided by the
// proto-google-common-protos dependency on the classpath.
sourceSets {
    main {
        proto {
            srcDir("../proto")
            exclude("third_party/**")
        }
    }
}

dependencies {
    // Spring Boot starters
    implementation("org.springframework.boot:spring-boot-starter-web")
    implementation("org.springframework.boot:spring-boot-starter-security")
    implementation("org.springframework.boot:spring-boot-starter-oauth2-resource-server")
    implementation("org.springframework.boot:spring-boot-starter-data-jpa")
    implementation("org.springframework.boot:spring-boot-starter-validation")
    implementation("org.springframework.boot:spring-boot-starter-actuator")

    // Database
    runtimeOnly("org.postgresql:postgresql")
    implementation("org.flywaydb:flyway-core")
    implementation("org.flywaydb:flyway-database-postgresql")

    // gRPC (client to the Go lottery-stats-server)
    implementation("io.grpc:grpc-netty-shaded:1.68.2")
    implementation("io.grpc:grpc-protobuf:1.68.2")
    implementation("io.grpc:grpc-stub:1.68.2")
    implementation("com.google.protobuf:protobuf-java:3.25.5")
    // Provides google/api/annotations.proto and http.proto for REST annotations
    implementation("com.google.api.grpc:proto-google-common-protos:2.29.0")
    // For annotations like @javax.annotation.Generated in generated stubs
    implementation("javax.annotation:javax.annotation-api:1.3.2")

    // OpenAPI / Swagger UI
    implementation("org.springdoc:springdoc-openapi-starter-webmvc-ui:2.6.0")

    // Lombok
    compileOnly("org.projectlombok:lombok")
    annotationProcessor("org.projectlombok:lombok")

    // Test
    testImplementation("org.springframework.boot:spring-boot-starter-test")
    testImplementation("org.springframework.security:spring-security-test")
    testImplementation("com.h2database:h2")
    testImplementation("org.testcontainers:junit-jupiter:1.20.4")
    testImplementation("org.testcontainers:postgresql:1.20.4")
}

tasks.withType<Test> {
    useJUnitPlatform()
}
