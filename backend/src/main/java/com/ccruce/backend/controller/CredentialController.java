package com.ccruce.backend.controller;

import com.ccruce.backend.dto.request.CredentialRequestDto;
import com.ccruce.backend.dto.response.CEReportResponseDto;
import com.ccruce.backend.dto.response.CERecordResponseDto;
import com.ccruce.backend.dto.response.CredentialResponseDto;
import com.ccruce.backend.enums.CredentialStatus;
import com.ccruce.backend.enums.CredentialType;
import com.ccruce.backend.service.CredentialService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/credentials")
public class CredentialController {

    private final CredentialService credentialService;

    public CredentialController(CredentialService credentialService) {
        this.credentialService = credentialService;
    }

    @PostMapping
    public ResponseEntity<CredentialResponseDto> createCredential(
            @Valid @RequestBody CredentialRequestDto requestDto
    ) {
        return ResponseEntity.status(HttpStatus.CREATED).body(credentialService.createCredential(requestDto));
    }

    @GetMapping
    public ResponseEntity<List<CredentialResponseDto>> getAllCredentials(
            @RequestParam(required = false) UUID userId,
            @RequestParam(required = false) CredentialStatus status,
            @RequestParam(required = false) CredentialType type,
            @RequestParam(required = false) String search
    ) {
        return ResponseEntity.ok(credentialService.getAllCredentials(userId, status, type, search));
    }

    @GetMapping("/{id}")
    public ResponseEntity<CredentialResponseDto> getCredentialById(@PathVariable UUID id) {
        return ResponseEntity.ok(credentialService.getCredentialById(id));
    }

    @GetMapping("/{id}/ce-records")
    public ResponseEntity<List<CERecordResponseDto>> getCredentialCERecords(@PathVariable UUID id) {
        return ResponseEntity.ok(credentialService.getCredentialCERecords(id));
    }

    @GetMapping("/{id}/ce-report")
    public ResponseEntity<CEReportResponseDto> getCredentialCEReport(@PathVariable UUID id) {
        return ResponseEntity.ok(credentialService.getCredentialCEReport(id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<CredentialResponseDto> updateCredential(
            @PathVariable UUID id,
            @Valid @RequestBody CredentialRequestDto requestDto
    ) {
        return ResponseEntity.ok(credentialService.updateCredential(id, requestDto));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteCredential(@PathVariable UUID id) {
        credentialService.deleteCredential(id);
        return ResponseEntity.noContent().build();
    }
}
