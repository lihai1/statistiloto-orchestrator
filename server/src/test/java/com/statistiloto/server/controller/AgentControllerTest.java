package com.statistiloto.server.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.statistiloto.server.dto.request.AgentApproveRequest;
import com.statistiloto.server.dto.request.AgentChatRequest;
import com.statistiloto.server.dto.request.LlmConfigRequest;
import com.statistiloto.server.dto.response.AgentChatResponse;
import com.statistiloto.server.dto.response.LlmConfigResponse;
import com.statistiloto.server.security.SecurityConfig;
import com.statistiloto.server.service.AgentClientService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * BFF tests for the agent proxy controller.
 *
 * <p>Uses {@link WebMvcTest} to load only the web layer (controller + security config).
 * The {@link AgentClientService} is mocked so we can verify controller behaviour
 * without a live Python agent service.
 *
 * <p>Authentication is simulated with {@link WithMockUser} for endpoints that do not
 * access the JWT principal directly, and with
 * {@code SecurityMockMvcRequestPostProcessors.jwt()} for endpoints that call
 * {@code jwt.getTokenValue()}.
 */
@WebMvcTest(AgentController.class)
@Import(SecurityConfig.class)
@TestPropertySource(properties = {
    "spring.security.oauth2.resourceserver.jwt.jwk-set-uri=http://localhost/auth/realms/statistiloto/protocol/openid-connect/certs",
    "spring.security.oauth2.resourceserver.jwt.audiences=statistiloto-ui"
})
class AgentControllerTest {

    @Autowired
    MockMvc mockMvc;

    @Autowired
    ObjectMapper objectMapper;

    @MockBean
    AgentClientService agentClientService;

    // ── POST /api/agent/chat ─────────────────────────────────────────────

    @Test
    void chat_withValidBody_returns200() throws Exception {
        AgentChatRequest request = new AgentChatRequest("session-1", "Hello", "chat");
        AgentChatResponse response = new AgentChatResponse("Hi there", "thread-123", false);
        when(agentClientService.chat(any(AgentChatRequest.class), any(String.class)))
            .thenReturn(response);

        mockMvc.perform(post("/api/agent/chat")
                .with(jwt())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.response").value("Hi there"))
            .andExpect(jsonPath("$.thread_id").value("thread-123"))
            .andExpect(jsonPath("$.paused").value(false));
    }

    @Test
    @WithMockUser
    void chat_withMissingSessionId_returns400() throws Exception {
        // sessionId is @NotBlank — omitting it should trigger validation.
        String json = "{\"message\":\"hello\",\"intent\":\"chat\"}";

        mockMvc.perform(post("/api/agent/chat")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json))
            .andExpect(status().isBadRequest());
    }

    // ── POST /api/agent/approve ──────────────────────────────────────────

    @Test
    void approve_withValidBody_returns200() throws Exception {
        AgentApproveRequest request = new AgentApproveRequest("session-1", true, null);
        AgentChatResponse response = new AgentChatResponse("Approved", "thread-123", false);
        when(agentClientService.approve(any(AgentApproveRequest.class), any(String.class)))
            .thenReturn(response);

        mockMvc.perform(post("/api/agent/approve")
                .with(jwt())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.response").value("Approved"))
            .andExpect(jsonPath("$.thread_id").value("thread-123"));
    }

    // ── GET /api/agent/llm-config ────────────────────────────────────────

    @Test
    void getLlmConfig_withAdminRole_returns200() throws Exception {
        LlmConfigResponse response = new LlmConfigResponse("openai", "gpt-4", "active", null);
        when(agentClientService.getLlmConfig(any(String.class))).thenReturn(response);

        mockMvc.perform(get("/api/agent/llm-config")
                .with(jwt().authorities(new SimpleGrantedAuthority("ROLE_ADMIN"))))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.provider").value("openai"))
            .andExpect(jsonPath("$.model").value("gpt-4"))
            .andExpect(jsonPath("$.status").value("active"));
    }

    @Test
    @WithMockUser
    void getLlmConfig_withoutAdminRole_returns403() throws Exception {
        mockMvc.perform(get("/api/agent/llm-config"))
            .andExpect(status().isForbidden());
    }

    // ── PUT /api/agent/llm-config ────────────────────────────────────────

    @Test
    void updateLlmConfig_withAdminRole_returns200() throws Exception {
        LlmConfigRequest request = new LlmConfigRequest("openai", "gpt-4", "https://api.openai.com", null);
        LlmConfigResponse response = new LlmConfigResponse("openai", "gpt-4", "updated", null);
        when(agentClientService.updateLlmConfig(any(LlmConfigRequest.class), any(String.class)))
            .thenReturn(response);

        mockMvc.perform(put("/api/agent/llm-config")
                .with(jwt().authorities(new SimpleGrantedAuthority("ROLE_ADMIN")))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.provider").value("openai"))
            .andExpect(jsonPath("$.model").value("gpt-4"))
            .andExpect(jsonPath("$.status").value("updated"));
    }

    @Test
    @WithMockUser
    void updateLlmConfig_withoutAdminRole_returns403() throws Exception {
        LlmConfigRequest request = new LlmConfigRequest("openai", "gpt-4", "https://api.openai.com", null);

        mockMvc.perform(put("/api/agent/llm-config")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isForbidden());
    }

    // ── GET /api/agent/health ────────────────────────────────────────────

    @Test
    @WithMockUser
    void health_returns200() throws Exception {
        when(agentClientService.health()).thenReturn("{\"status\":\"ok\"}");

        mockMvc.perform(get("/api/agent/health"))
            .andExpect(status().isOk())
            .andExpect(content().string("{\"status\":\"ok\"}"));
    }
}
