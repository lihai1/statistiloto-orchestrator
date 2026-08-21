package com.statistiloto.server.dto.request;

import jakarta.validation.constraints.NotEmpty;
import java.time.LocalDate;
import java.util.List;

/** Request to analyze user-selected numbers against historical data. */
public record AnalyzeRequest(
    @NotEmpty List<Integer> form,
    LocalDate from,
    LocalDate to
) {}
