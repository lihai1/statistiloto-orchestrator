package com.statistiloto.server.service;

import com.google.protobuf.Timestamp;
import com.statistiloto.lottery.v1.AnalyzeRequest;
import com.statistiloto.lottery.v1.DateWindow;
import com.statistiloto.lottery.v1.GenerateFormRequest;
import com.statistiloto.lottery.v1.GetStatisticsRequest;
import com.statistiloto.lottery.v1.LotteryServiceGrpc;
import com.statistiloto.lottery.v1.Strength;
import com.statistiloto.server.dto.request.StatisticsRequest;
import com.statistiloto.server.dto.response.FrequencyEntryResponse;
import com.statistiloto.server.dto.response.FrequencyGroupResponse;
import com.statistiloto.server.dto.response.LotteryResultResponse;
import com.statistiloto.server.dto.response.PairResponse;
import io.grpc.ManagedChannel;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Service that proxies lottery computation requests to the Go
 * lottery-stats-server via gRPC. Uses fully-qualified DTO names to
 * avoid collision with proto generated types of the same name.
 */
@Service
public class LotteryClientService {

    private static final Logger log = LoggerFactory.getLogger(LotteryClientService.class);

    private final LotteryServiceGrpc.LotteryServiceBlockingStub stub;

    public LotteryClientService(ManagedChannel lotteryGrpcChannel) {
        this.stub = LotteryServiceGrpc.newBlockingStub(lotteryGrpcChannel);
    }

    public LotteryResultResponse generateForm(com.statistiloto.server.dto.request.GenerateFormRequest req) {
        log.info("[generateForm] START howMany={} formType={} strength={} willBe={} from={} to={}",
            req.howMany(), req.formType(), req.strength(), req.willBe(), req.from(), req.to());
        try {
            var protoReq = GenerateFormRequest.newBuilder()
                .setHowMany(req.howMany())
                .setFormType(req.formType() != null ? req.formType() : 0)
                .addAllWillBe(req.willBe() != null ? req.willBe().stream().map(Integer::intValue).toList() : List.of())
                .setStrength(parseStrength(req.strength()))
                .setWindow(buildWindow(req.from(), req.to()))
                .build();

            log.info("[generateForm] Calling gRPC stub.generateForm...");
            var resp = stub.generateForm(protoReq);
            log.info("[generateForm] gRPC response received: {} forms", resp.getFormsCount());

            List<List<Integer>> forms = resp.getFormsList().stream()
                .map(ns -> {
                    var nums = ns.getNumbersList().stream().map(Integer::valueOf).collect(Collectors.toList());
                    if (ns.hasStrong() && ns.getStrong() > 0) {
                        nums.add(ns.getStrong());
                    }
                    return nums;
                })
                .toList();

            log.info("[generateForm] SUCCESS returning {} forms", forms.size());
            return new LotteryResultResponse(forms, null, null);
        } catch (io.grpc.StatusRuntimeException e) {
            log.error("[generateForm] gRPC ERROR status={} description={} msg={}",
                e.getStatus().getCode(), e.getStatus().getDescription(), e.getMessage(), e);
            throw e;
        } catch (RuntimeException e) {
            log.error("[generateForm] ERROR msg={}", e.getMessage(), e);
            throw e;
        }
    }

    public LotteryResultResponse getStatistics(StatisticsRequest req) {
        log.info("[getStatistics] START howMany={} formType={} strength={} from={} to={}",
            req.howMany(), req.formType(), req.strength(), req.from(), req.to());
        try {
            var protoReq = GetStatisticsRequest.newBuilder()
                .setHowMany(req.howMany())
                .setFormType(req.formType() != null ? req.formType() : 0)
                .setStrength(parseStrength(req.strength()))
                .setWindow(buildWindow(req.from(), req.to()))
                .build();

            log.info("[getStatistics] Calling gRPC stub.getStatistics...");
            var resp = stub.getStatistics(protoReq);
            log.info("[getStatistics] gRPC response received: {} pairs", resp.getPairsCount());

            List<PairResponse> pairs = resp.getPairsList().stream()
                .map(p -> new PairResponse(
                    p.getNumbersList().stream().map(Integer::valueOf).collect(Collectors.toList()),
                    p.getCount()))
                .toList();

            log.info("[getStatistics] SUCCESS returning {} pairs", pairs.size());
            return new LotteryResultResponse(null, pairs, null);
        } catch (io.grpc.StatusRuntimeException e) {
            log.error("[getStatistics] gRPC ERROR status={} description={} msg={}",
                e.getStatus().getCode(), e.getStatus().getDescription(), e.getMessage(), e);
            throw e;
        } catch (RuntimeException e) {
            log.error("[getStatistics] ERROR msg={}", e.getMessage(), e);
            throw e;
        }
    }

    public LotteryResultResponse analyze(com.statistiloto.server.dto.request.AnalyzeRequest req) {
        log.info("[analyze] START formSize={} form={} from={} to={}",
            req.form().size(), req.form(), req.from(), req.to());
        try {
            var protoReq = AnalyzeRequest.newBuilder()
                .addAllForm(req.form().stream().map(Integer::intValue).toList())
                .setWindow(buildWindow(req.from(), req.to()))
                .build();

            log.info("[analyze] Calling gRPC stub.analyze...");
            var resp = stub.analyze(protoReq);
            log.info("[analyze] gRPC response received: {} frequency groups, archiveSize={}",
                resp.getFrequencyGroupsCount(), resp.getArchiveSize());

            List<FrequencyGroupResponse> frequencyGroups = resp.getFrequencyGroupsList().stream()
                .map(g -> new FrequencyGroupResponse(
                    g.getSize(),
                    g.getCombos(),
                    g.getEntriesList().stream()
                        .map(e -> new FrequencyEntryResponse(
                            e.getNumbersList().stream().map(Integer::valueOf).collect(Collectors.toList()),
                            e.getCount()))
                        .toList()))
                .toList();

            int totalEntries = frequencyGroups.stream()
                .mapToInt(g -> g.entries().size())
                .sum();

            log.info("[analyze] SUCCESS returning {} frequency groups ({} total entries)",
                frequencyGroups.size(), totalEntries);
            return new LotteryResultResponse(null, null, frequencyGroups);
        } catch (io.grpc.StatusRuntimeException e) {
            log.error("[analyze] gRPC ERROR status={} description={} msg={}",
                e.getStatus().getCode(), e.getStatus().getDescription(), e.getMessage(), e);
            throw e;
        } catch (RuntimeException e) {
            log.error("[analyze] ERROR msg={}", e.getMessage(), e);
            throw e;
        }
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
            log.debug("buildWindow: from or to is null, using default instance");
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
