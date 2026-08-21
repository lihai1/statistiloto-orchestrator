package com.statistiloto.server.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
import java.util.List;

/** Request to generate lottery number combinations. */
public record GenerateFormRequest(
    @NotNull @Min(0) Integer howMany,
    Integer formType,
    List<Integer> willBe,
    LocalDate from,
    LocalDate to,
    String strength
) {}
