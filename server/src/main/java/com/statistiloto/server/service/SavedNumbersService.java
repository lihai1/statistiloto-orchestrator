package com.statistiloto.server.service;

import com.statistiloto.server.dto.request.SaveNumbersRequest;
import com.statistiloto.server.dto.response.SavedNumbersResponse;
import com.statistiloto.server.entity.SavedNumbers;
import com.statistiloto.server.repository.SavedNumbersRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/** CRUD operations for user-saved lottery numbers. */
@Service
@Transactional
public class SavedNumbersService {

    private final SavedNumbersRepository repository;

    public SavedNumbersService(SavedNumbersRepository repository) {
        this.repository = repository;
    }

    public List<SavedNumbersResponse> getForUser(String userSub) {
        return repository.findByUserSubOrderByCreatedAtDesc(userSub).stream()
            .map(this::toResponse)
            .toList();
    }

    public SavedNumbersResponse save(String userSub, SaveNumbersRequest req) {
        SavedNumbers entity = new SavedNumbers(userSub, req.category(), req.numbers());
        entity.setWillBe(req.willBe());
        entity.setDateFrom(req.dateFrom());
        entity.setDateTo(req.dateTo());
        return toResponse(repository.save(entity));
    }

    public void delete(String userSub, Long id) {
        SavedNumbers entity = repository.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("Saved numbers not found: " + id));
        if (!entity.getUserSub().equals(userSub)) {
            throw new SecurityException("Not authorized to delete this resource");
        }
        repository.delete(entity);
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
