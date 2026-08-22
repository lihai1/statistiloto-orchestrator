package com.statistiloto.server.dto.response;

import java.util.List;

/** One number combination and its occurrence count from the analyze result. */
public record FrequencyEntryResponse(
    List<Integer> numbers,
    int count
) {}
