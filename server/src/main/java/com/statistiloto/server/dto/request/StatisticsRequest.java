package com.statistiloto.server.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
import java.util.List;

/** Request to calculate statistics for number pairs. */
public record StatisticsRequest(
    @NotNull @Min(1) Integer howMany,
    Integer formType,
    LocalDate from,
    LocalDate to,
    String strength
) {}
