package com.statistiloto.server.controller;

import com.statistiloto.server.dto.request.AnalyzeRequest;
import com.statistiloto.server.dto.request.GenerateFormRequest;
import com.statistiloto.server.dto.request.StatisticsRequest;
import com.statistiloto.server.dto.response.LotteryResultResponse;
import com.statistiloto.server.service.LotteryClientService;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

/**
 * Lottery computation endpoints. These proxy to the Go lottery-stats-server
 * via gRPC. The user's JWT is validated by Spring Security before reaching
 * here.
 */
@RestController
@RequestMapping("/api/generate")
public class GenerateController {

    private static final Logger log = LoggerFactory.getLogger(GenerateController.class);

    private final LotteryClientService lotteryClient;

    public GenerateController(LotteryClientService lotteryClient) {
        this.lotteryClient = lotteryClient;
    }

    @PostMapping("/form")
    public LotteryResultResponse generateForm(@AuthenticationPrincipal Jwt jwt,
                                              @Valid @RequestBody GenerateFormRequest request) {
        String userSub = jwt != null ? jwt.getSubject() : "anonymous";
        log.info("[generateForm] START user={} howMany={} formType={} strength={}",
            userSub, request.howMany(), request.formType(), request.strength());
        try {
            LotteryResultResponse result = lotteryClient.generateForm(request);
            log.info("[generateForm] SUCCESS user={} forms={}", userSub,
                result.forms() != null ? result.forms().size() : 0);
            return result;
        } catch (RuntimeException e) {
            log.error("[generateForm] ERROR user={} msg={}", userSub, e.getMessage(), e);
            throw e;
        }
    }

    @PostMapping("/statistics")
    public LotteryResultResponse getStatistics(@AuthenticationPrincipal Jwt jwt,
                                               @Valid @RequestBody StatisticsRequest request) {
        String userSub = jwt != null ? jwt.getSubject() : "anonymous";
        log.info("[getStatistics] START user={} howMany={} formType={} strength={}",
            userSub, request.howMany(), request.formType(), request.strength());
        try {
            LotteryResultResponse result = lotteryClient.getStatistics(request);
            log.info("[getStatistics] SUCCESS user={} pairs={}", userSub,
                result.pairs() != null ? result.pairs().size() : 0);
            return result;
        } catch (RuntimeException e) {
            log.error("[getStatistics] ERROR user={} msg={}", userSub, e.getMessage(), e);
            throw e;
        }
    }

    @PostMapping("/analyze")
    public LotteryResultResponse analyze(@AuthenticationPrincipal Jwt jwt,
                                         @Valid @RequestBody AnalyzeRequest request) {
        String userSub = jwt != null ? jwt.getSubject() : "anonymous";
        log.info("[analyze] START user={} formSize={} from={} to={}",
            userSub, request.form().size(), request.from(), request.to());
        try {
            LotteryResultResponse result = lotteryClient.analyze(request);
            log.info("[analyze] SUCCESS user={} frequencyGroups={}",
                userSub,
                result.frequencyGroups() != null ? result.frequencyGroups().size() : 0);
            return result;
        } catch (RuntimeException e) {
            log.error("[analyze] ERROR user={} msg={}", userSub, e.getMessage(), e);
            throw e;
        }
    }
}
