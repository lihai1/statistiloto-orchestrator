package com.statistiloto.server.entity;

import jakarta.persistence.*;
import java.time.Instant;

/** User profile keyed by the Keycloak subject (sub) claim. */
@Entity
@Table(name = "user_profile", schema = "app")
public class UserProfile {

    @Id
    @Column(name = "sub", nullable = false, updatable = false)
    private String sub;

    @Column(name = "display_name")
    private String displayName;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public UserProfile() {}

    public UserProfile(String sub, String displayName) {
        this.sub = sub;
        this.displayName = displayName;
        this.createdAt = Instant.now();
        this.updatedAt = Instant.now();
    }

    public String getSub() { return sub; }
    public void setSub(String sub) { this.sub = sub; }
    public String getDisplayName() { return displayName; }
    public void setDisplayName(String displayName) { this.displayName = displayName; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}
