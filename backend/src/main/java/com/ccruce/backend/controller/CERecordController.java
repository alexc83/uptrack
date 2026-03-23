package com.ccruce.backend.controller;

import com.ccruce.backend.dto.request.CERecordRequestDto;
import com.ccruce.backend.dto.response.CERecordResponseDto;
import com.ccruce.backend.service.CERecordService;
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
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/ce-records")
public class CERecordController {

    private final CERecordService ceRecordService;

    public CERecordController(CERecordService ceRecordService) {
        this.ceRecordService = ceRecordService;
    }

    @PostMapping
    public ResponseEntity<CERecordResponseDto> createCERecord(
            @Valid @RequestBody CERecordRequestDto requestDto
    ) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ceRecordService.createCERecord(requestDto));
    }

    @GetMapping
    public ResponseEntity<List<CERecordResponseDto>> getAllCERecords() {
        return ResponseEntity.ok(ceRecordService.getAllCERecords());
    }

    @GetMapping("/{id}")
    public ResponseEntity<CERecordResponseDto> getCERecordById(@PathVariable UUID id) {
        return ResponseEntity.ok(ceRecordService.getCERecordById(id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<CERecordResponseDto> updateCERecord(
            @PathVariable UUID id,
            @Valid @RequestBody CERecordRequestDto requestDto
    ) {
        return ResponseEntity.ok(ceRecordService.updateCERecord(id, requestDto));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteCERecord(@PathVariable UUID id) {
        ceRecordService.deleteCERecord(id);
        return ResponseEntity.noContent().build();
    }
}
