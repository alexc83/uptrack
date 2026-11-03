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
    void acceptsPdfWithTrailingDataAfterEofMarkerButNotBeyondTheTailWindow() throws Exception {
        byte[] pdf = CertificateFixtures.pdf();
        // Common generator behaviour: a few hundred trailing bytes after %%EOF.
        byte[] withTrailing = new byte[pdf.length + 500];
        System.arraycopy(pdf, 0, withTrailing, 0, pdf.length);
        java.util.Arrays.fill(withTrailing, pdf.length, withTrailing.length, (byte) 'x');
        accepts("certificate.pdf", "application/pdf", withTrailing);
        // Trailing data that pushes %%EOF out of the final 4 KiB window is still refused.
        byte[] tooMuch = new byte[pdf.length + 5000];
        System.arraycopy(pdf, 0, tooMuch, 0, pdf.length);
        assertThrows(BadRequestException.class, () -> validator.validate(new MockMultipartFile(
                "file", "certificate.pdf", "application/pdf", tooMuch)));
    }

    @Test
    void acceptsLargeButBoundedImageDimensionsAndRejectsBeyondTheCapBeforeDecoding() throws Exception {
        // 5100x5000 = 25.5 Mpx: above the old 25 Mpx cap, within the 40 Mpx cap.
        var image = new java.awt.image.BufferedImage(5100, 5000, java.awt.image.BufferedImage.TYPE_BYTE_GRAY);
        var output = new ByteArrayOutputStream();
        assertTrue(javax.imageio.ImageIO.write(image, "png", output));
        accepts("certificate.png", "image/png", output.toByteArray());
        // 7000x6000 = 42 Mpx: header-only rejection, no raster allocation.
        var bomb = pngHeader(7000, 6000);
        var exception = assertThrows(BadRequestException.class, () -> validator.validate(
                new MockMultipartFile("file", "certificate.png", "image/png", bomb)));
        assertTrue(exception.getMessage().contains("dimensions"), exception.getMessage());
    }

    private static byte[] pngHeader(int width, int height) throws Exception {
        var out = new ByteArrayOutputStream();
        out.write(new byte[]{(byte) 137, 80, 78, 71, 13, 10, 26, 10});
        var ihdr = new ByteArrayOutputStream();
        writeInt(ihdr, width);
        writeInt(ihdr, height);
        ihdr.write(new byte[]{8, 2, 0, 0, 0}); // 8-bit truecolor
        writeChunk(out, "IHDR", ihdr.toByteArray());
        writeChunk(out, "IEND", new byte[0]);
        return out.toByteArray();
    }

    private static void writeChunk(ByteArrayOutputStream out, String type, byte[] data) throws Exception {
        writeInt(out, data.length);
        byte[] typeBytes = type.getBytes(java.nio.charset.StandardCharsets.US_ASCII);
        out.write(typeBytes);
        out.write(data);
        var crc = new java.util.zip.CRC32();
        crc.update(typeBytes);
        crc.update(data);
        writeInt(out, (int) crc.getValue());
    }

    private static void writeInt(ByteArrayOutputStream out, int value) {
        out.write((value >>> 24) & 0xFF);
        out.write((value >>> 16) & 0xFF);
        out.write((value >>> 8) & 0xFF);
        out.write(value & 0xFF);
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
