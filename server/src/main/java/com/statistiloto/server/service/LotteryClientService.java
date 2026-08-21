package com.statistiloto.server.service;

import com.google.protobuf.Timestamp;
import com.statistiloto.lottery.v1.AnalyzeRequest;
import com.statistiloto.lottery.v1.DateWindow;
import com.statistiloto.lottery.v1.GenerateFormRequest;
import com.statistiloto.lottery.v1.GetStatisticsRequest;
import com.statistiloto.lottery.v1.LotteryServiceGrpc;
import com.statistiloto.lottery.v1.Strength;
import com.statistiloto.server.dto.request.StatisticsRequest;
import com.statistiloto.server.dto.response.FormMatchResponse;
import com.statistiloto.server.dto.response.LotteryResultResponse;
import com.statistiloto.server.dto.response.PairResponse;
import io.grpc.ManagedChannel;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Service that proxies lottery computation requests to the Go
 * lottery-stats-server via gRPC. Uses fully-qualified DTO names to
 * avoid collision with proto-generated types of the same name.
 */
@Service
public class LotteryClientService {

    private final LotteryServiceGrpc.LotteryServiceBlockingStub stub;

    public LotteryClientService(ManagedChannel lotteryGrpcChannel) {
        this.stub = LotteryServiceGrpc.newBlockingStub(lotteryGrpcChannel);
    }

    public LotteryResultResponse generateForm(com.statistiloto.server.dto.request.GenerateFormRequest req) {
        var protoReq = GenerateFormRequest.newBuilder()
            .setHowMany(req.howMany())
            .setFormType(req.formType() != null ? req.formType() : 0)
            .addAllWillBe(req.willBe() != null ? req.willBe().stream().map(Integer::intValue).toList() : List.of())
            .setStrength(parseStrength(req.strength()))
            .setWindow(buildWindow(req.from(), req.to()))
            .build();

        var resp = stub.generateForm(protoReq);
        List<List<Integer>> forms = resp.getFormsList().stream()
            .map(ns -> ns.getNumbersList().stream().map(Integer::valueOf).collect(Collectors.toList()))
            .toList();

        return new LotteryResultResponse(forms, null, null, null);
    }

    public LotteryResultResponse getStatistics(StatisticsRequest req) {
        var protoReq = GetStatisticsRequest.newBuilder()
            .setHowMany(req.howMany())
            .setFormType(req.formType() != null ? req.formType() : 0)
            .setStrength(parseStrength(req.strength()))
            .setWindow(buildWindow(req.from(), req.to()))
            .build();

        var resp = stub.getStatistics(protoReq);
        List<PairResponse> pairs = resp.getPairsList().stream()
            .map(p -> new PairResponse(
                p.getNumbersList().stream().map(Integer::valueOf).collect(Collectors.toList()),
                p.getCount()))
            .toList();

        return new LotteryResultResponse(null, pairs, null, null);
    }

    public LotteryResultResponse analyze(com.statistiloto.server.dto.request.AnalyzeRequest req) {
        var protoReq = AnalyzeRequest.newBuilder()
            .addAllForm(req.form().stream().map(Integer::intValue).toList())
            .setWindow(buildWindow(req.from(), req.to()))
            .build();

        var resp = stub.analyze(protoReq);
        Map<Integer, Integer> frequency = new HashMap<>();
        resp.getFrequencyMap().forEach((k, v) -> frequency.put(k, v));

        List<FormMatchResponse> matches = resp.getMatchesList().stream()
            .map(m -> new FormMatchResponse(
                m.getDrawId(),
                m.getDrawDate(),
                m.getMatchedNumbersList().stream().map(Integer::valueOf).collect(Collectors.toList()),
                m.getMatchCount()))
            .toList();

        return new LotteryResultResponse(null, null, frequency, matches);
    }

    private Strength parseStrength(String s) {
        if (s == null) return Strength.STRENGTH_UNSPECIFIED;
        return switch (s.toLowerCase()) {
            case "strong" -> Strength.STRONG;
            case "weak" -> Strength.WEAK;
            default -> Strength.STRENGTH_UNSPECIFIED;
        };
    }

    private DateWindow buildWindow(LocalDate from, LocalDate to) {
        if (from == null || to == null) {
            return DateWindow.getDefaultInstance();
        }
        return DateWindow.newBuilder()
            .setFrom(toTimestamp(from))
            .setTo(toTimestamp(to))
            .build();
    }

    private Timestamp toTimestamp(LocalDate date) {
        return Timestamp.newBuilder()
            .setSeconds(date.atStartOfDay().toEpochSecond(ZoneOffset.UTC))
            .build();
    }
}
