package com.statistiloto.server.dto.request;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
import java.util.List;

/** Request to save a set of lottery numbers for the authenticated user. */
public record SaveNumbersRequest(
    @NotNull String category,
    @NotEmpty List<Integer> numbers,
    List<Integer> willBe,
    LocalDate dateFrom,
    LocalDate dateTo
) {}
