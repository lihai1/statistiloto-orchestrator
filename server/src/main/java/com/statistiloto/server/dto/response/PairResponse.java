package com.statistiloto.server.dto.response;

import java.util.List;

/** A frequent number pair/group with its occurrence count. */
public record PairResponse(
    List<Integer> numbers,
    Integer count
) {}
