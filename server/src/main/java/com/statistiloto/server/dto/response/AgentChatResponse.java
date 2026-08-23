package com.statistiloto.server.dto.response;

import com.fasterxml.jackson.annotation.JsonProperty;

/** Response from the agent — either a chat response or a paused HITL state. */
public record AgentChatResponse(
    String response,
    @JsonProperty("thread_id") String threadId,
    @JsonProperty("paused") Boolean isPaused
) {
    /** Convenience accessor: true when the agent paused for human approval. */
    public boolean paused() {
        return isPaused != null && isPaused;
    }
}
