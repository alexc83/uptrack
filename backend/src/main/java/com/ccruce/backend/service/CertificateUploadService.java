package com.ccruce.backend.service;

import com.ccruce.backend.dto.response.CertificateUploadResponseDto;
import org.springframework.web.multipart.MultipartFile;

public interface CertificateUploadService {

    CertificateUploadResponseDto uploadCertificate(MultipartFile file);
}
