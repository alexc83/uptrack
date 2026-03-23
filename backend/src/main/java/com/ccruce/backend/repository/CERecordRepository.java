package com.ccruce.backend.repository;

import com.ccruce.backend.entity.CERecord;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface CERecordRepository extends JpaRepository<CERecord, UUID> {

    List<CERecord> findAllByUserId(UUID userId);

    List<CERecord> findAllByCredentialId(UUID credentialId);
}
