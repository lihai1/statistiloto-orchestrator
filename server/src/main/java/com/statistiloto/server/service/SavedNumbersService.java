package com.statistiloto.server.service;

import com.statistiloto.server.dto.request.SaveNumbersRequest;
import com.statistiloto.server.dto.response.SavedNumbersResponse;
import com.statistiloto.server.entity.SavedNumbers;
import com.statistiloto.server.repository.SavedNumbersRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/** CRUD operations for user-saved lottery numbers. */
@Service
@Transactional
public class SavedNumbersService {

    private static final Logger log = LoggerFactory.getLogger(SavedNumbersService.class);

    private final SavedNumbersRepository repository;
    private final UserProfileService userProfileService;

    public SavedNumbersService(SavedNumbersRepository repository, UserProfileService userProfileService) {
        this.repository = repository;
        this.userProfileService = userProfileService;
    }

    public List<SavedNumbersResponse> getForUser(String userSub) {
        log.info("[getForUser] START user={}", userSub);
        try {
            List<SavedNumbersResponse> result = repository.findByUserSubOrderByCreatedAtDesc(userSub).stream()
                .map(this::toResponse)
                .toList();
            log.info("[getForUser] SUCCESS user={} count={}", userSub, result.size());
            return result;
        } catch (RuntimeException e) {
            log.error("[getForUser] ERROR user={} msg={}", userSub, e.getMessage(), e);
            throw e;
        }
    }

    public SavedNumbersResponse save(String userSub, SaveNumbersRequest req) {
        log.info("[save] START user={} category={} count={} willBe={} dateFrom={} dateTo={}",
            userSub, req.category(), req.numbers().size(),
            req.willBe(), req.dateFrom(), req.dateTo());
        if (userSub == null) {
            log.error("[save] FAIL — userSub is null, aborting save");
            throw new IllegalArgumentException("User subject cannot be null");
        }
        try {
            // Ensure user_profile row exists to satisfy FK constraint
            userProfileService.ensureProfile(userSub, null);
            SavedNumbers entity = new SavedNumbers(userSub, req.category(), req.numbers());
            entity.setWillBe(req.willBe());
            entity.setDateFrom(req.dateFrom());
            entity.setDateTo(req.dateTo());
            SavedNumbers saved = repository.save(entity);
            log.info("[save] SUCCESS user={} id={} category={}", userSub, saved.getId(), saved.getCategory());
            return toResponse(saved);
        } catch (RuntimeException e) {
            log.error("[save] ERROR user={} category={} msg={}", userSub, req.category(), e.getMessage(), e);
            throw e;
        }
    }

    public void delete(String userSub, Long id) {
        log.info("[delete] START user={} id={}", userSub, id);
        try {
            SavedNumbers entity = repository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Saved numbers not found: " + id));
            if (!entity.getUserSub().equals(userSub)) {
                log.warn("[delete] FORBIDDEN — user={} attempted to delete id={} owned by {}",
                    userSub, id, entity.getUserSub());
                throw new SecurityException("Not authorized to delete this resource");
            }
            repository.delete(entity);
            log.info("[delete] SUCCESS user={} id={}", userSub, id);
        } catch (RuntimeException e) {
            log.error("[delete] ERROR user={} id={} msg={}", userSub, id, e.getMessage(), e);
            throw e;
        }
    }

    private SavedNumbersResponse toResponse(SavedNumbers entity) {
        return new SavedNumbersResponse(
            entity.getId(),
            entity.getCategory(),
            entity.getNumbers(),
            entity.getWillBe(),
            entity.getDateFrom(),
            entity.getDateTo(),
            entity.getCreatedAt()
        );
    }
}
