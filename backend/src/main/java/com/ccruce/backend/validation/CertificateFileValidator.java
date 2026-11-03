package com.ccruce.backend.validation;

import com.ccruce.backend.exception.BadRequestException;
import com.ccruce.backend.exception.UploadTooLargeException;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.cos.COSDictionary;
import org.apache.pdfbox.cos.COSName;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import javax.imageio.ImageIO;
import javax.imageio.ImageReader;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

@Component
public class CertificateFileValidator {
    public static final long MAX_BYTES = 5L * 1024 * 1024;
    // 40 Mpx covers common full-page scans (e.g. 7000x4000 = 28 Mpx) while bounding one
    // decoded frame to ~160 MB; concurrent decodes are additionally capped by a semaphore
    // in CertificateUploadServiceImpl. Decompression bombs stay rejected by this cap.
    static final long MAX_PIXELS = 40_000_000;
    // %%EOF must appear within the final 4 KiB; some generators append trailing data.
    // PDFBox parsing plus the active-content scan remain the actual security gate.
    private static final int PDF_EOF_TAIL_WINDOW = 4096;
    private static final Map<String, String> TYPES = Map.of(
            "pdf", "application/pdf", "jpg", "image/jpeg", "jpeg", "image/jpeg",
            "png", "image/png", "webp", "image/webp", "gif", "image/gif");
    private static final Set<String> ACTIVE_PDF_KEYS = Set.of(
            "JS", "JavaScript", "OpenAction", "AA", "Launch", "EmbeddedFiles", "EF",
            "RichMedia", "RichMediaContent", "RichMediaSettings", "3DD", "Movie", "Sound",
            "XFA", "AcroForm", "GoToR", "GoToE", "SubmitForm", "ImportData");
    private static final Set<String> ACTIVE_PDF_ACTIONS = Set.of(
            "JavaScript", "Launch", "GoToR", "GoToE", "SubmitForm", "ImportData", "Rendition", "Movie", "Sound");

    public byte[] validate(MultipartFile file) {
        if (file == null) throw new BadRequestException("Certificate file is required.");
        if (file.getSize() > MAX_BYTES) throw new UploadTooLargeException();
        if (file.isEmpty()) throw new BadRequestException("Certificate file must not be empty.");
        String name = file.getOriginalFilename();
        String extension = name == null || !name.contains(".") ? "" :
                name.substring(name.lastIndexOf('.') + 1).toLowerCase(Locale.ROOT);
        String mime = TYPES.get(extension);
        if (mime == null || !mime.equalsIgnoreCase(file.getContentType())) {
            throw new BadRequestException("Unsupported certificate file type. Allowed types: PDF, JPG, JPEG, PNG, WEBP, GIF.");
        }
        try (var input = file.getInputStream()) {
            // Bound reads even for MultipartFile implementations reporting an incorrect size.
            byte[] bytes = input.readNBytes((int) MAX_BYTES + 1);
            if (bytes.length > MAX_BYTES) throw new UploadTooLargeException();
            if (extension.equals("pdf")) validatePdf(bytes);
            else validateImage(bytes, extension);
            return bytes;
        } catch (IOException | IllegalArgumentException exception) {
            throw new BadRequestException("Certificate content is invalid or does not match its file type.");
        }
    }

    private void validatePdf(byte[] bytes) throws IOException {
        String prefix = new String(bytes, 0, Math.min(bytes.length, 8), StandardCharsets.US_ASCII);
        if (!prefix.startsWith("%PDF-") || !hasEofMarkerInTail(bytes)) {
            throw new IOException("Invalid PDF envelope");
        }
        try (PDDocument document = Loader.loadPDF(bytes)) {
            if (document.isEncrypted() || document.getNumberOfPages() == 0) throw new IOException("Unsupported PDF");
            // PDFBox resolves escaped names and compressed object streams; a byte substring check would not.
            Set<org.apache.pdfbox.cos.COSBase> seen = java.util.Collections.newSetFromMap(new java.util.IdentityHashMap<>());
            checkDictionary(document.getDocumentCatalog().getCOSObject(), seen, 0);
            for (var key : document.getDocument().getXrefTable().keySet()) {
                var value = document.getDocument().getObjectFromPool(key).getObject();
                checkDictionary(value, seen, 0);
            }
        }
    }

    private static boolean hasEofMarkerInTail(byte[] bytes) {
        byte[] marker = "%%EOF".getBytes(StandardCharsets.US_ASCII);
        int from = Math.max(0, bytes.length - PDF_EOF_TAIL_WINDOW);
        outer:
        for (int i = bytes.length - marker.length; i >= from; i--) {
            if (i < 0) break;
            for (int j = 0; j < marker.length; j++) {
                if (bytes[i + j] != marker[j]) continue outer;
            }
            return true;
        }
        return false;
    }

    private void checkDictionary(org.apache.pdfbox.cos.COSBase value, Set<org.apache.pdfbox.cos.COSBase> seen, int depth)
            throws IOException {
        if (value == null || !seen.add(value)) return;
        if (depth > 100 || seen.size() > 100_000) throw new IOException("Excessively nested PDF");
        if (value instanceof org.apache.pdfbox.cos.COSObject object) {
            checkDictionary(object.getObject(), seen, depth + 1);
        } else if (value instanceof COSDictionary dictionary) {
            for (COSName key : dictionary.keySet()) {
                if (ACTIVE_PDF_KEYS.contains(key.getName())) throw new IOException("Active PDF content");
                var nested = dictionary.getDictionaryObject(key);
                if (key.getName().equals("S") && nested instanceof COSName action
                        && ACTIVE_PDF_ACTIONS.contains(action.getName())) throw new IOException("Active PDF action");
                checkDictionary(nested, seen, depth + 1);
            }
        } else if (value instanceof org.apache.pdfbox.cos.COSArray array) {
            for (var item : array) checkDictionary(item, seen, depth + 1);
        }
    }

    private void validateImage(byte[] bytes, String extension) throws IOException {
        try (var input = ImageIO.createImageInputStream(new ByteArrayInputStream(bytes))) {
            var readers = ImageIO.getImageReaders(input);
            if (!readers.hasNext()) throw new IOException("Not an image");
            ImageReader reader = readers.next();
            try {
                String expected = extension.equals("jpg") ? "jpeg" : extension;
                if (!expected.equalsIgnoreCase(reader.getFormatName())) throw new IOException("Mismatched image");
                reader.setInput(input, false, true);
                int frames = reader.getNumImages(true);
                if (frames < 1 || frames > 100) {
                    throw new BadRequestException("Certificate images may have at most 100 frames.");
                }
                long pixels = 0;
                for (int frame = 0; frame < frames; frame++) {
                    int width = reader.getWidth(frame);
                    int height = reader.getHeight(frame);
                    pixels += (long) width * height;
                    if (width < 1 || height < 1 || pixels > MAX_PIXELS) {
                        // Checked from the header before decoding, so oversized or bomb
                        // images are rejected without allocating their raster.
                        throw new BadRequestException(
                                "Certificate image dimensions exceed the supported limit of 40 megapixels.");
                    }
                    if (reader.read(frame) == null) throw new IOException("Malformed image");
                }
            } finally {
                reader.dispose();
            }
        }
    }
}
