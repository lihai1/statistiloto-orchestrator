package com.statistiloto.server.dto.response;

import java.util.List;
import java.util.Map;

/** Generic lottery computation result (from the Go service). */
public record LotteryResultResponse(
    List<List<Integer>> forms,
    List<PairResponse> pairs,
    Map<Integer, Integer> frequency,
    List<FormMatchResponse> matches
) {}
