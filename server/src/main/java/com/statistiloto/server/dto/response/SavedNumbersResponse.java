package com.statistiloto.server.dto.response;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

/** Saved lottery numbers for a user. */
public record SavedNumbersResponse(
    Long id,
    String category,
    List<Integer> numbers,
    List<Integer> willBe,
    LocalDate dateFrom,
    LocalDate dateTo,
    Instant createdAt
) {}
