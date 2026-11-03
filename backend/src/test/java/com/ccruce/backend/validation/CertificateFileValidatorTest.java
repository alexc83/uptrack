package com.ccruce.backend.validation;

import com.ccruce.backend.CertificateFixtures;
import com.ccruce.backend.exception.*;
import org.apache.pdfbox.pdmodel.*;
import org.apache.pdfbox.pdmodel.interactive.action.PDActionJavaScript;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.mock.web.MockMultipartFile;
import java.io.ByteArrayOutputStream;
import java.util.Base64;
import static org.junit.jupiter.api.Assertions.*;

class CertificateFileValidatorTest {
    private final CertificateFileValidator validator = new CertificateFileValidator();

    @Test
    void acceptsPlainPdfAndAllSupportedRasterFormats() throws Exception {
        accepts("certificate.pdf", "application/pdf", CertificateFixtures.pdf());
        for (String format : new String[]{"png", "jpeg", "gif"}) {
            accepts("certificate." + format, "image/" + format, CertificateFixtures.image(format));
        }
        accepts("certificate.jpg", "image/jpeg", CertificateFixtures.image("jpeg"));
        accepts("certificate.webp", "image/webp", Base64.getDecoder().decode(
                "UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA=="));
    }

    @ParameterizedTest
    @CsvSource({"file.html,image/png", "file.svg,application/pdf", "file.exe,image/jpeg",
            "file.pdf,text/html", "file.png,image/jpeg"})
    void rejectsUnsupportedOrMismatchedDeclarations(String name, String mime) {
        assertThrows(BadRequestException.class, () -> validator.validate(
                new MockMultipartFile("file", name, mime, "<html>bad</html>".getBytes())));
    }

    @Test
    void rejectsDisguisedAndTruncatedContentAndEmptyFiles() throws Exception {
        for (byte[] bytes : new byte[][]{new byte[0], "not a PDF".getBytes(), "%PDF-1.7\n%%EOF".getBytes()}) {
            assertThrows(BadRequestException.class, () -> validator.validate(
                    new MockMultipartFile("file", "certificate.pdf", "application/pdf", bytes)));
        }
        assertThrows(BadRequestException.class, () -> validator.validate(new MockMultipartFile(
                "file", "certificate.png", "image/png", CertificateFixtures.image("jpeg"))));
        assertThrows(BadRequestException.class, () -> validator.validate(new MockMultipartFile(
                "file", "certificate.png", "image/png", new byte[]{(byte) 137, 80, 78, 71, 13, 10, 26, 10})));
    }

    @Test
    void rejectsOversizeBeforeReadingAndNullParts() {
        assertThrows(UploadTooLargeException.class, () -> validator.validate(new MockMultipartFile(
                "file", "certificate.pdf", "application/pdf", new byte[(int) CertificateFileValidator.MAX_BYTES + 1])));
        assertThrows(BadRequestException.class, () -> validator.validate(null));
    }

    @Test
    void rejectsParsedActiveContentIncludingCompressedObjects() throws Exception {
        try (var document = new PDDocument(); var output = new ByteArrayOutputStream()) {
            document.addPage(new PDPage());
            document.getDocumentCatalog().setOpenAction(new PDActionJavaScript("app.alert('test')"));
            document.save(output);
            assertThrows(BadRequestException.class, () -> validator.validate(new MockMultipartFile(
                    "file", "certificate.pdf", "application/pdf", output.toByteArray())));
        }
    }

    private void accepts(String name, String mime, byte[] bytes) {
        assertArrayEquals(bytes, validator.validate(new MockMultipartFile("file", name, mime, bytes)));
    }
}
