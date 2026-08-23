package com.statistiloto.server.service;

import com.statistiloto.server.dto.request.AgentApproveRequest;
import com.statistiloto.server.dto.request.AgentChatRequest;
import com.statistiloto.server.dto.request.LlmConfigRequest;
import com.statistiloto.server.dto.response.AgentChatResponse;
import com.statistiloto.server.dto.response.LlmConfigResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

/**
 * HTTP client to the Python agent service.
 * Forwards requests with the user's JWT Bearer token for authentication.
 *
 * Request DTOs use @JsonProperty for snake_case serialization (Python API expects
 * session_id, base_url, api_key) and @JsonAlias to also accept camelCase from the UI.
 */
@Service
public class AgentClientService {

    private static final Logger log = LoggerFactory.getLogger(AgentClientService.class);

    private final RestClient restClient;

    public AgentClientService(
        @Value("${agent.service.url:http://agent:8000}") String agentUrl,
        @Value("${agent.read-timeout-ms:300000}") int readTimeoutMs
    ) {
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(5000);
        // LLM inference (especially small local models on limited hardware) can take
        // several minutes. Configurable via agent.read-timeout-ms property / AGENT_READ_TIMEOUT_MS env.
        requestFactory.setReadTimeout(readTimeoutMs);

        this.restClient = RestClient.builder()
            .baseUrl(agentUrl)
            .requestFactory(requestFactory)
            .build();
        log.info("[agent-client] Initialized base_url={} connect_timeout=5000ms read_timeout={}ms", agentUrl, readTimeoutMs);
    }

    public AgentChatResponse chat(AgentChatRequest req, String authHeader) {
        log.info("[agent-client.chat] START session={} intent={}", req.sessionId(), req.intent());
        try {
            AgentChatResponse result = restClient.post()
                .uri("/chat")
                .header(HttpHeaders.AUTHORIZATION, authHeader)
                .header(HttpHeaders.ACCEPT, "application/json")
                .body(req)
                .retrieve()
                .body(AgentChatResponse.class);
            log.info("[agent-client.chat] SUCCESS session={} paused={}", req.sessionId(), result != null && result.paused());
            return result;
        } catch (RuntimeException e) {
            log.error("[agent-client.chat] ERROR session={} msg={}", req.sessionId(), e.getMessage(), e);
            throw e;
        }
    }

    public AgentChatResponse approve(AgentApproveRequest req, String authHeader) {
        log.info("[agent-client.approve] START session={} approved={}", req.sessionId(), req.approved());
        try {
            AgentChatResponse result = restClient.post()
                .uri("/approve")
                .header(HttpHeaders.AUTHORIZATION, authHeader)
                .header(HttpHeaders.ACCEPT, "application/json")
                .body(req)
                .retrieve()
                .body(AgentChatResponse.class);
            log.info("[agent-client.approve] SUCCESS session={}", req.sessionId());
            return result;
        } catch (RuntimeException e) {
            log.error("[agent-client.approve] ERROR session={} msg={}", req.sessionId(), e.getMessage(), e);
            throw e;
        }
    }

    public LlmConfigResponse getLlmConfig(String authHeader) {
        log.info("[agent-client.llm-config] GET START");
        try {
            LlmConfigResponse result = restClient.get()
                .uri("/llm-config")
                .header(HttpHeaders.AUTHORIZATION, authHeader)
                .header(HttpHeaders.ACCEPT, "application/json")
                .retrieve()
                .body(LlmConfigResponse.class);
            log.info("[agent-client.llm-config] GET SUCCESS provider={} model={}", result != null ? result.provider() : "?", result != null ? result.model() : "?");
            return result;
        } catch (RuntimeException e) {
            log.error("[agent-client.llm-config] GET ERROR msg={}", e.getMessage(), e);
            throw e;
        }
    }

    public LlmConfigResponse updateLlmConfig(LlmConfigRequest req, String authHeader) {
        log.info("[agent-client.llm-config] UPDATE START provider={} model={}", req.provider(), req.model());
        try {
            LlmConfigResponse result = restClient.put()
                .uri("/llm-config")
                .header(HttpHeaders.AUTHORIZATION, authHeader)
                .header(HttpHeaders.ACCEPT, "application/json")
                .body(req)
                .retrieve()
                .body(LlmConfigResponse.class);
            log.info("[agent-client.llm-config] UPDATE SUCCESS status={}", result != null ? result.status() : "?");
            return result;
        } catch (RuntimeException e) {
            log.error("[agent-client.llm-config] UPDATE ERROR msg={}", e.getMessage(), e);
            throw e;
        }
    }

    public String health() {
        try {
            return restClient.get()
                .uri("/healthz")
                .retrieve()
                .body(String.class);
        } catch (Exception e) {
            log.warn("[agent-client.health] Agent service unreachable: {}", e.getMessage());
            return "{\"status\":\"unavailable\"}";
        }
    }

    public String getTokenUsage(String authHeader) {
        log.info("[agent-client.token-usage] GET START");
        try {
            String result = restClient.get()
                .uri("/token-usage")
                .header(HttpHeaders.AUTHORIZATION, authHeader)
                .header(HttpHeaders.ACCEPT, "application/json")
                .retrieve()
                .body(String.class);
            log.info("[agent-client.token-usage] GET SUCCESS");
            return result;
        } catch (RuntimeException e) {
            log.error("[agent-client.token-usage] GET ERROR msg={}", e.getMessage(), e);
            throw e;
        }
    }

    public String getAuditLog(String authHeader, int limit) {
        log.info("[agent-client.audit-log] GET START limit={}", limit);
        try {
            String result = restClient.get()
                .uri(builder -> builder.path("/audit-log").queryParam("limit", limit).build())
                .header(HttpHeaders.AUTHORIZATION, authHeader)
                .header(HttpHeaders.ACCEPT, "application/json")
                .retrieve()
                .body(String.class);
            log.info("[agent-client.audit-log] GET SUCCESS");
            return result;
        } catch (RuntimeException e) {
            log.error("[agent-client.audit-log] GET ERROR msg={}", e.getMessage(), e);
            throw e;
        }
    }
}
