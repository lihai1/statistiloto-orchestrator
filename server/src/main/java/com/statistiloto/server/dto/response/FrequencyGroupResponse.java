package com.statistiloto.server.dto.response;

import java.util.List;

/** Grouped frequency results for one group size (1–6) from the analyze result. */
public record FrequencyGroupResponse(
    int size,
    int combos,
    List<FrequencyEntryResponse> entries
) {}
