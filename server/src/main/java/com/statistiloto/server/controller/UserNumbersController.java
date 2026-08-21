package com.statistiloto.server.controller;

import com.statistiloto.server.dto.request.SaveNumbersRequest;
import com.statistiloto.server.dto.response.SavedNumbersResponse;
import com.statistiloto.server.service.SavedNumbersService;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** CRUD for user-saved lottery numbers. */
@RestController
@RequestMapping("/api/user/numbers")
public class UserNumbersController {

    private final SavedNumbersService savedNumbersService;

    public UserNumbersController(SavedNumbersService savedNumbersService) {
        this.savedNumbersService = savedNumbersService;
    }

    @GetMapping
    public List<SavedNumbersResponse> getMyNumbers(@AuthenticationPrincipal Jwt jwt) {
        return savedNumbersService.getForUser(jwt.getSubject());
    }

    @PostMapping
    public SavedNumbersResponse saveNumbers(@AuthenticationPrincipal Jwt jwt,
                                            @Valid @RequestBody SaveNumbersRequest request) {
        return savedNumbersService.save(jwt.getSubject(), request);
    }

    @DeleteMapping("/{id}")
    public void deleteNumbers(@AuthenticationPrincipal Jwt jwt, @PathVariable Long id) {
        savedNumbersService.delete(jwt.getSubject(), id);
    }
}
