# syntax=docker/dockerfile:1
# Java Spring Boot BFF image.
# Build context is the repo root (see docker-compose.yml):
#   docker build -f server/Dockerfile -t statistiloto-server .

# ── Build stage ──────────────────────────────────────────────────────
FROM gradle:8.10.2-jdk21 AS builder

WORKDIR /app/server

# 1) Build descriptors first → dependency resolution is cached as its own
#    Docker layer.  Source edits do NOT invalidate this layer, so deps are
#    only re-resolved when build.gradle.kts / settings.gradle.kts change.
COPY server/build.gradle.kts server/settings.gradle.kts ./

# 2) Shared proto contract (needed for gRPC stub codegen via the protobuf
#    plugin's srcDir("../proto")).  Copied before the source so a proto
#    change rebuilds from here, not from the deps layer.
COPY proto/ /app/proto/

# Make Gradle build cache + parallel execution permanent inside the image
# so the cache is used regardless of how gradle is invoked.
RUN printf 'org.gradle.caching=true\norg.gradle.parallel=true\n' > gradle.properties

# Warm the dependency cache.  --mount persists ~/.gradle across builds
# (the gradle image runs as root; /root/.gradle symlinks to
# /home/gradle/.gradle, which is the mount target).  `|| true` guards
# against the protobuf plugin's configuration-time tasks that may not
# fully resolve before source is present.
#
# --no-watch-fs disables Gradle's file watcher, which doesn't work well
# in build containers and adds startup overhead.
RUN --mount=type=cache,target=/home/gradle/.gradle \
    gradle dependencies --no-daemon --no-watch-fs --build-cache || true

# 3) Application source — only this layer and the build layer invalidate
#    on a code edit.
COPY server/src ./src

# 4) Build the fat jar.  bootJar (not `build`) skips test compilation,
#    javadoc, and check tasks — only what's needed for the runtime image.
RUN --mount=type=cache,target=/home/gradle/.gradle \
    gradle bootJar -x test --no-daemon --no-watch-fs --build-cache

# 5) Extract Spring Boot layers → runtime image layer caching.  When only
#    app code changes, the dependencies/ layer is reused and only the
#    small application/ layer is pushed.
#    Copy the jar to a fixed name first so the extracted application/
#    layer contains "application.jar" (matches the ENTRYPOINT below).
RUN JAR="$(find build/libs -type f -name "*.jar" ! -name "*-plain.jar" -print -quit)" && \
    test -n "$JAR" && \
    cp "$JAR" application.jar && \
    java -Djarmode=tools -jar application.jar extract --layers --destination extracted

# ── Runtime stage ────────────────────────────────────────────────────
FROM eclipse-temurin:21-jre-alpine

RUN addgroup -S spring && adduser -S spring -G spring

WORKDIR /app

COPY --from=builder /app/server/extracted/dependencies/ ./
COPY --from=builder /app/server/extracted/spring-boot-loader/ ./
COPY --from=builder /app/server/extracted/snapshot-dependencies/ ./
COPY --from=builder /app/server/extracted/application/ ./

USER spring

EXPOSE 8082

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
    CMD wget -qO- http://localhost:8082/actuator/health || exit 1

ENTRYPOINT ["java", "-jar", "application.jar"]
