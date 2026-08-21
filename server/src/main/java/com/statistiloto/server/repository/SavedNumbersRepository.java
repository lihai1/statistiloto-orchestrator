package com.statistiloto.server.repository;

import com.statistiloto.server.entity.SavedNumbers;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SavedNumbersRepository extends JpaRepository<SavedNumbers, Long> {
    List<SavedNumbers> findByUserSubOrderByCreatedAtDesc(String userSub);
}
