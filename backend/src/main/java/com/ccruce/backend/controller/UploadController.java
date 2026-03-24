package com.ccruce.backend.controller;

import com.ccruce.backend.dto.response.CertificateUploadResponseDto;
import com.ccruce.backend.service.CertificateUploadService;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/uploads")
public class UploadController {

    private final CertificateUploadService certificateUploadService;

    public UploadController(CertificateUploadService certificateUploadService) {
        this.certificateUploadService = certificateUploadService;
    }

    @PostMapping(path = "/certificates", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<CertificateUploadResponseDto> uploadCertificate(
            @RequestPart("file") MultipartFile file
    ) {
        return ResponseEntity.status(HttpStatus.CREATED).body(certificateUploadService.uploadCertificate(file));
    }
}
