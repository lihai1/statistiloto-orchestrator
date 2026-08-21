package com.statistiloto.server.grpc;

import io.grpc.ManagedChannel;
import io.grpc.ManagedChannelBuilder;
import jakarta.annotation.PreDestroy;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import com.statistiloto.lottery.v1.LotteryServiceGrpc;

import java.util.concurrent.TimeUnit;

/**
 * gRPC client configuration for the Go lottery-stats-server.
 *
 * <p>Creates a single shared {@link ManagedChannel} and a
 * {@link LotteryServiceGrpc.LotteryServiceBlockingStub} for the BFF to call
 * the Go algorithm service.
 */
@Configuration
public class GrpcClientConfig {

    @Value("${lottery.grpc.host}")
    private String grpcHost;

    @Value("${lottery.grpc.port}")
    private int grpcPort;

    private ManagedChannel channel;

    @Bean
    public ManagedChannel lotteryGrpcChannel() {
        channel = ManagedChannelBuilder.forAddress(grpcHost, grpcPort)
            .usePlaintext()
            .build();
        return channel;
    }

    @Bean
    public LotteryServiceGrpc.LotteryServiceBlockingStub lotteryGrpcStub(ManagedChannel lotteryGrpcChannel) {
        return LotteryServiceGrpc.newBlockingStub(lotteryGrpcChannel);
    }

    @PreDestroy
    public void shutdown() {
        if (channel != null) {
            channel.shutdown();
            try {
                channel.awaitTermination(5, TimeUnit.SECONDS);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        }
    }
}
