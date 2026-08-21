package com.statistiloto.server.dto.response;

import java.util.List;

/** A historical draw that overlaps the submitted form. */
public record FormMatchResponse(
    String drawId,
    String drawDate,
    List<Integer> matchedNumbers,
    Integer matchCount
) {}
