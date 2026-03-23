package com.ccruce.backend.repository;

import com.ccruce.backend.entity.Credential;
import com.ccruce.backend.enums.CredentialType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface CredentialRepository extends JpaRepository<Credential, UUID> {

    List<Credential> findAllByUserId(UUID userId);

    List<Credential> findAllByUserIdAndType(UUID userId, CredentialType type);
}
