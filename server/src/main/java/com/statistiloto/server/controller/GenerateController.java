package com.statistiloto.server.controller;

import com.statistiloto.server.dto.request.AnalyzeRequest;
import com.statistiloto.server.dto.request.GenerateFormRequest;
import com.statistiloto.server.dto.request.StatisticsRequest;
import com.statistiloto.server.dto.response.LotteryResultResponse;
import com.statistiloto.server.service.LotteryClientService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

/**
 * Lottery computation endpoints. These proxy to the Go lottery-stats-server
 * via gRPC. The user's JWT is validated by Spring Security before reaching
 * here.
 */
@RestController
@RequestMapping("/api/generate")
public class GenerateController {

    private final LotteryClientService lotteryClient;

    public GenerateController(LotteryClientService lotteryClient) {
        this.lotteryClient = lotteryClient;
    }

    @PostMapping("/form")
    public LotteryResultResponse generateForm(@Valid @RequestBody GenerateFormRequest request) {
        return lotteryClient.generateForm(request);
    }

    @PostMapping("/statistics")
    public LotteryResultResponse getStatistics(@Valid @RequestBody StatisticsRequest request) {
        return lotteryClient.getStatistics(request);
    }

    @PostMapping("/analyze")
    public LotteryResultResponse analyze(@Valid @RequestBody AnalyzeRequest request) {
        return lotteryClient.analyze(request);
    }
}
