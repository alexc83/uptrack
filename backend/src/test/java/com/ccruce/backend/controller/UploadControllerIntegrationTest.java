package com.ccruce.backend.controller;

import com.cloudinary.Cloudinary;
import com.cloudinary.Uploader;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;

import java.util.Map;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class UploadControllerIntegrationTest extends AbstractControllerIntegrationTest {

    @MockBean
    private Cloudinary cloudinary;

    private Uploader uploader;

    @BeforeEach
    void setUpCloudinaryMock() {
        uploader = Mockito.mock(Uploader.class);
        when(cloudinary.uploader()).thenReturn(uploader);
    }

    @Test
    void shouldRejectUnauthenticatedCertificateUpload() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "acls-cert.pdf",
                "application/pdf",
                com.ccruce.backend.CertificateFixtures.pdf()
        );

        mockMvc.perform(multipart("/api/uploads/certificates").file(file))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Authentication is required."));
    }

    @Test
    void shouldRejectMissingCertificateFile() throws Exception {
        AuthSession session = registerUser("Nina Hart", "nina.hart@example.com");

        mockMvc.perform(multipart("/api/uploads/certificates")
                        .header("Authorization", bearerToken(session)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Certificate file is required."));
    }

    @Test
    void shouldRejectUnsupportedCertificateFileType() throws Exception {
        AuthSession session = registerUser("Kai Foster", "kai.foster@example.com");
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "notes.txt",
                "text/plain",
                "not-a-certificate".getBytes()
        );

        mockMvc.perform(multipart("/api/uploads/certificates")
                        .file(file)
                        .header("Authorization", bearerToken(session)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Unsupported certificate file type. Allowed types: PDF, JPG, JPEG, PNG, WEBP, GIF."));
    }

    @Test
    void shouldRejectEmptyCertificateFile() throws Exception {
        AuthSession session = registerUser("Jules Palmer", "jules.palmer@example.com");
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "blank.pdf",
                "application/pdf",
                new byte[0]
        );

        mockMvc.perform(multipart("/api/uploads/certificates")
                        .file(file)
                        .header("Authorization", bearerToken(session)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Certificate file must not be empty."));
    }

    @Test
    void shouldUploadCertificateAndReturnHostedAssetMetadata() throws Exception {
        AuthSession session = registerUser("Riley Brooks", "riley.brooks@example.com");
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "acls-cert.pdf",
                "application/pdf",
                com.ccruce.backend.CertificateFixtures.pdf()
        );

        when(uploader.upload(any(), argThat(options ->
                "raw".equals(options.get("resource_type"))
                        && Boolean.FALSE.equals(options.get("use_filename"))
                        && !options.containsKey("filename_override")
        ))).thenAnswer(invocation -> {
            Map<String, Object> options = invocation.getArgument(1);
            return Map.of("secure_url", "https://res.example.test/raw/upload/v1/" + options.get("public_id"),
                    "public_id", options.get("public_id"), "resource_type", "raw", "type", "upload");
        });

        mockMvc.perform(multipart("/api/uploads/certificates")
                        .file(file)
                        .header("Authorization", bearerToken(session)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.url").value(org.hamcrest.Matchers.endsWith(".pdf")))
                .andExpect(jsonPath("$.publicId").value(org.hamcrest.Matchers.allOf(
                        org.hamcrest.Matchers.startsWith("uptrack/users/%s/certificates/".formatted(session.userId())),
                        org.hamcrest.Matchers.endsWith(".pdf"))))
                .andExpect(jsonPath("$.originalFilename").value("acls-cert.pdf"))
                .andExpect(jsonPath("$.resourceType").value("raw"));
    }

    @Test
    void shouldReturnStructuredErrorWhenCloudinaryUploadFails() throws Exception {
        AuthSession session = registerUser("Ari Bennett", "ari.bennett@example.com");
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "credential.png",
                "image/png",
                com.ccruce.backend.CertificateFixtures.image("png")
        );

        when(uploader.upload(any(), anyMap())).thenThrow(new RuntimeException("Cloudinary unavailable"));

        mockMvc.perform(multipart("/api/uploads/certificates")
                        .file(file)
                        .header("Authorization", bearerToken(session)))
                .andExpect(status().isBadGateway())
                .andExpect(jsonPath("$.message").value("Certificate upload failed."));
    }
}
