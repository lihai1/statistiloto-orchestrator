package com.statistiloto.server.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

/** Saved lottery numbers belonging to a user (identified by Keycloak sub). */
@Entity
@Table(name = "saved_numbers", schema = "app")
public class SavedNumbers {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Column(name = "user_sub", nullable = false)
    private String userSub;

    @Column(name = "category", nullable = false)
    private String category;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "numbers", nullable = false, columnDefinition = "jsonb")
    private List<Integer> numbers;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "will_be", columnDefinition = "jsonb")
    private List<Integer> willBe;

    @Column(name = "date_from")
    private LocalDate dateFrom;

    @Column(name = "date_to")
    private LocalDate dateTo;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public SavedNumbers() {}

    public SavedNumbers(String userSub, String category, List<Integer> numbers) {
        this.userSub = userSub;
        this.category = category;
        this.numbers = numbers;
        this.createdAt = Instant.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getUserSub() { return userSub; }
    public void setUserSub(String userSub) { this.userSub = userSub; }
    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }
    public List<Integer> getNumbers() { return numbers; }
    public void setNumbers(List<Integer> numbers) { this.numbers = numbers; }
    public List<Integer> getWillBe() { return willBe; }
    public void setWillBe(List<Integer> willBe) { this.willBe = willBe; }
    public LocalDate getDateFrom() { return dateFrom; }
    public void setDateFrom(LocalDate dateFrom) { this.dateFrom = dateFrom; }
    public LocalDate getDateTo() { return dateTo; }
    public void setDateTo(LocalDate dateTo) { this.dateTo = dateTo; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
