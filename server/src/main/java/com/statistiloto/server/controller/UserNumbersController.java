package com.statistiloto.server.controller;

import com.statistiloto.server.dto.request.SaveNumbersRequest;
import com.statistiloto.server.dto.response.SavedNumbersResponse;
import com.statistiloto.server.service.SavedNumbersService;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** CRUD for user-saved lottery numbers. */
@RestController
@RequestMapping("/api/user/numbers")
public class UserNumbersController {

    private static final Logger log = LoggerFactory.getLogger(UserNumbersController.class);

    private final SavedNumbersService savedNumbersService;

    public UserNumbersController(SavedNumbersService savedNumbersService) {
        this.savedNumbersService = savedNumbersService;
    }

    @GetMapping
    public List<SavedNumbersResponse> getMyNumbers(@AuthenticationPrincipal Jwt jwt) {
        String userSub = jwt != null ? jwt.getSubject() : null;
        log.info("[getMyNumbers] START user={}", userSub);
        if (userSub == null) {
            log.error("[getMyNumbers] FAIL — JWT subject is null, cannot fetch user numbers");
            throw new IllegalStateException("JWT subject is null");
        }
        try {
            List<SavedNumbersResponse> result = savedNumbersService.getForUser(userSub);
            log.info("[getMyNumbers] SUCCESS user={} count={}", userSub, result.size());
            return result;
        } catch (RuntimeException e) {
            log.error("[getMyNumbers] ERROR user={} msg={}", userSub, e.getMessage(), e);
            throw e;
        }
    }

    @PostMapping
    public SavedNumbersResponse saveNumbers(@AuthenticationPrincipal Jwt jwt,
                                            @Valid @RequestBody SaveNumbersRequest request) {
        String userSub = jwt != null ? jwt.getSubject() : null;
        log.info("[saveNumbers] START user={} category={} count={} willBe={} dateFrom={} dateTo={}",
            userSub, request.category(), request.numbers().size(),
            request.willBe(), request.dateFrom(), request.dateTo());
        if (userSub == null) {
            log.error("[saveNumbers] FAIL — JWT subject is null, cannot save numbers");
            throw new IllegalStateException("JWT subject is null — token may be missing sub claim");
        }
        try {
            SavedNumbersResponse result = savedNumbersService.save(userSub, request);
            log.info("[saveNumbers] SUCCESS user={} id={} category={}",
                userSub, result.id(), result.category());
            return result;
        } catch (RuntimeException e) {
            log.error("[saveNumbers] ERROR user={} category={} msg={}",
                userSub, request.category(), e.getMessage(), e);
            throw e;
        }
    }

    @DeleteMapping("/{id}")
    public void deleteNumbers(@AuthenticationPrincipal Jwt jwt, @PathVariable Long id) {
        String userSub = jwt != null ? jwt.getSubject() : null;
        log.info("[deleteNumbers] START user={} id={}", userSub, id);
        if (userSub == null) {
            log.error("[deleteNumbers] FAIL — JWT subject is null, cannot delete");
            throw new IllegalStateException("JWT subject is null");
        }
        try {
            savedNumbersService.delete(userSub, id);
            log.info("[deleteNumbers] SUCCESS user={} id={}", userSub, id);
        } catch (RuntimeException e) {
            log.error("[deleteNumbers] ERROR user={} id={} msg={}", userSub, id, e.getMessage(), e);
            throw e;
        }
    }
}
