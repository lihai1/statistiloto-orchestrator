package com.statistiloto.server.controller;

import com.statistiloto.server.dto.request.AgentChatRequest;
import com.statistiloto.server.dto.request.AgentApproveRequest;
import com.statistiloto.server.dto.request.LlmConfigRequest;
import com.statistiloto.server.dto.response.AgentChatResponse;
import com.statistiloto.server.dto.response.LlmConfigResponse;
import com.statistiloto.server.service.AgentClientService;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

/**
 * Agent proxy endpoints. These forward to the Python agent service.
 * The UI never calls the agent service directly.
 */
@RestController
@RequestMapping("/api/agent")
public class AgentController {

    private static final Logger log = LoggerFactory.getLogger(AgentController.class);

    private final AgentClientService agentClient;

    public AgentController(AgentClientService agentClient) {
        this.agentClient = agentClient;
    }

    @PostMapping("/chat")
    public AgentChatResponse chat(@AuthenticationPrincipal Jwt jwt,
                                  @Valid @RequestBody AgentChatRequest request) {
        String userSub = jwt != null ? jwt.getSubject() : "anonymous";
        log.info("[agent.chat] START user={} session={} intent={}", userSub, request.sessionId(), request.intent());
        try {
            String authHeader = "Bearer " + jwt.getTokenValue();
            AgentChatResponse result = agentClient.chat(request, authHeader);
            log.info("[agent.chat] SUCCESS user={} paused={}", userSub, result.paused());
            return result;
        } catch (RuntimeException e) {
            log.error("[agent.chat] ERROR user={} msg={}", userSub, e.getMessage(), e);
            throw e;
        }
    }

    @PostMapping("/approve")
    public AgentChatResponse approve(@AuthenticationPrincipal Jwt jwt,
                                     @Valid @RequestBody AgentApproveRequest request) {
        String userSub = jwt != null ? jwt.getSubject() : "anonymous";
        log.info("[agent.approve] START user={} session={} approved={}", userSub, request.sessionId(), request.approved());
        try {
            String authHeader = "Bearer " + jwt.getTokenValue();
            AgentChatResponse result = agentClient.approve(request, authHeader);
            log.info("[agent.approve] SUCCESS user={}", userSub);
            return result;
        } catch (RuntimeException e) {
            log.error("[agent.approve] ERROR user={} msg={}", userSub, e.getMessage(), e);
            throw e;
        }
    }

    @GetMapping("/llm-config")
    @PreAuthorize("hasRole('ADMIN')")
    public LlmConfigResponse getLlmConfig(@AuthenticationPrincipal Jwt jwt) {
        String userSub = jwt != null ? jwt.getSubject() : "anonymous";
        log.info("[agent.llm-config] GET user={}", userSub);
        try {
            String authHeader = "Bearer " + jwt.getTokenValue();
            LlmConfigResponse result = agentClient.getLlmConfig(authHeader);
            log.info("[agent.llm-config] GET SUCCESS user={} provider={} model={}", userSub, result.provider(), result.model());
            return result;
        } catch (RuntimeException e) {
            log.error("[agent.llm-config] GET ERROR user={} msg={}", userSub, e.getMessage(), e);
            throw e;
        }
    }

    @PutMapping("/llm-config")
    @PreAuthorize("hasRole('ADMIN')")
    public LlmConfigResponse updateLlmConfig(@AuthenticationPrincipal Jwt jwt,
                                             @Valid @RequestBody LlmConfigRequest request) {
        String userSub = jwt != null ? jwt.getSubject() : "anonymous";
        log.info("[agent.llm-config] UPDATE START user={} provider={} model={}", userSub, request.provider(), request.model());
        try {
            String authHeader = "Bearer " + jwt.getTokenValue();
            LlmConfigResponse result = agentClient.updateLlmConfig(request, authHeader);
            log.info("[agent.llm-config] UPDATE SUCCESS user={} status={}", userSub, result.status());
            return result;
        } catch (RuntimeException e) {
            log.error("[agent.llm-config] UPDATE ERROR user={} msg={}", userSub, e.getMessage(), e);
            throw e;
        }
    }

    @GetMapping("/health")
    public String agentHealth() {
        return agentClient.health();
    }

    @GetMapping("/token-usage")
    @PreAuthorize("hasRole('ADMIN')")
    public String getTokenUsage(@AuthenticationPrincipal Jwt jwt) {
        String authHeader = "Bearer " + jwt.getTokenValue();
        return agentClient.getTokenUsage(authHeader);
    }

    @GetMapping("/audit-log")
    @PreAuthorize("hasRole('ADMIN')")
    public String getAuditLog(@AuthenticationPrincipal Jwt jwt,
                              @RequestParam(defaultValue = "50") int limit) {
        String authHeader = "Bearer " + jwt.getTokenValue();
        return agentClient.getAuditLog(authHeader, limit);
    }
}
