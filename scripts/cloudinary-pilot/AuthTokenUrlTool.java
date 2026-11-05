import com.cloudinary.AuthToken;
import com.cloudinary.Cloudinary;
import com.cloudinary.Url;

import java.util.HashMap;
import java.util.Map;

/**
 * Local AuthToken URL generator for the Issue #23 non-production Cloudinary pilot.
 *
 * <p>Reference signing implementation for the pilot (SDK 2.5.0). Two code-level findings from
 * inspecting cloudinary-core 2.5.0 ({@code Url.generate} bytecode) are baked in here and must be
 * mirrored in {@code CertificateDeliveryServiceImpl} before the pilot can pass:
 * <b>(1)</b> {@code Url.signed(true)} is required — without it the AuthToken is silently dropped
 * from the URL; <b>(2)</b> the {@code AuthToken} must be constructed with the API secret as its
 * signing key ({@code new AuthToken(apiSecret)}) — without a key, {@code AuthToken.generate}
 * cannot HMAC and the token is empty/invalid. URL generation is purely local signing — this tool
 * makes <b>no network calls</b>.
 *
 * <p>Secrets are read only from environment variables ({@code CLOUDINARY_CLOUD_NAME},
 * {@code CLOUDINARY_API_KEY}, {@code CLOUDINARY_API_SECRET}) — never from argv — and are never
 * printed. The generated URL (which necessarily contains the signed token parameter, {@code _a} in SDK 2.5.0) is
 * written to stdout for the caller to use; callers must not log it.
 *
 * <p>Usage:
 * <pre>
 *   java AuthTokenUrlTool --resource-type raw --public-id pilot/authenticated/synth --format pdf --duration 60
 *   java AuthTokenUrlTool --self-test
 * </pre>
 */
public final class AuthTokenUrlTool {

    private AuthTokenUrlTool() {
    }

    public static void main(String[] args) {
        try {
            if (args.length == 1 && "--self-test".equals(args[0])) {
                selfTest();
                return;
            }
            String resourceType = null;
            String publicId = null;
            String format = null;
            int duration = 60;
            for (int i = 0; i < args.length; i++) {
                switch (args[i]) {
                    case "--resource-type" -> resourceType = args[++i];
                    case "--public-id" -> publicId = args[++i]; // NOTE: without format extension; use --format
                    case "--format" -> format = args[++i];
                    case "--duration" -> duration = Integer.parseInt(args[++i]);
                    default -> fail("unknown argument: " + args[i]);
                }
            }
            if (resourceType == null || publicId == null) {
                fail("--resource-type and --public-id are required (see README)");
            }
            if (duration < 1 || duration > 3600) {
                fail("--duration must be within 1..3600");
            }
            System.out.println(generate(
                    env("CLOUDINARY_CLOUD_NAME"), env("CLOUDINARY_API_KEY"), env("CLOUDINARY_API_SECRET"),
                    resourceType, publicId, format, duration));
        } catch (Exception e) {
            System.err.println("authtoken-tool error: " + e.getMessage());
            System.exit(1);
        }
    }

    /** Same construction as the backend delivery service. Never logs secrets or tokens. */
    static String generate(String cloudName, String apiKey, String apiSecret,
                           String resourceType, String publicId, String format, int duration) {
        Map<String, String> config = new HashMap<>();
        config.put("cloud_name", cloudName);
        config.put("api_key", apiKey);
        config.put("api_secret", apiSecret);
        Cloudinary cloudinary = new Cloudinary(config);
        AuthToken token = new AuthToken(apiSecret) // signing key — required, see class javadoc
                .duration(duration)
                .acl("/" + resourceType + "/authenticated/" + publicId);
        Url url = cloudinary.url()
                .secure(true)
                .signed(true) // required — otherwise the AuthToken is silently omitted
                .type("authenticated")
                .resourceType(resourceType)
                .authToken(token);
        if ("raw".equals(resourceType) && format != null && !format.isBlank()) {
            url.format(format);
        }
        return url.generate(publicId);
    }

    /**
     * Offline structural checks with dummy credentials. Proves URL/token generation is local
     * (no network), deterministic per inputs, ACL/path shape, and duration sensitivity.
     * This does NOT prove live provider authorization — that requires the authorized pilot.
     */
    private static void selfTest() {
        String cloud = "pilot-selftest-cloud";
        String key = "000000000000000";
        String secret = "0123456789abcdef0123456789abcdef"; // dummy hex key; never a real secret
        String pdfUrl = generate(cloud, key, secret, "raw", "pilot/authenticated/a", "pdf", 60);
        String pngUrl = generate(cloud, key, secret, "image", "pilot/authenticated/b.png", null, 60);
        String pdfUrlOtherPid = generate(cloud, key, secret, "raw", "pilot/authenticated/c", "pdf", 60);
        String pdfUrlLongTtl = generate(cloud, key, secret, "raw", "pilot/authenticated/a", "pdf", 3600);

        require(pdfUrl.startsWith("https://res.cloudinary.com/" + cloud + "/raw/authenticated/"),
                "raw URL shape: " + pdfUrl);
        String pdfPath = pdfUrl.substring(0, pdfUrl.indexOf('?'));
        require(pdfPath.endsWith("/pilot/authenticated/a.pdf"), "raw URL path ends with public id + format extension");
        require(pngUrl.substring(0, pngUrl.indexOf('?')).contains("/image/authenticated/") && pngUrl.contains("/pilot/authenticated/b.png"), "image URL shape");
        require(pdfUrl.contains("__cld_token__="), "AuthToken parameter present");
        require(pdfUrl.contains("acl="), "ACL embedded in token");
        require(!pdfUrl.contains(secret) && !pngUrl.contains(secret), "secret must not appear in URL");
        String tokenA = queryParam(pdfUrl, "__cld_token__");
        String tokenC = queryParam(pdfUrlOtherPid, "__cld_token__");
        String tokenLong = queryParam(pdfUrlLongTtl, "__cld_token__");
        require(tokenA != null && tokenC != null && !tokenA.equals(tokenC),
                "token binds to the public id (ACL subject)");
        require(tokenA != null && tokenA.contains("hmac="), "token is HMAC-signed (key was used)");
        require(tokenLong != null && !tokenA.equals(tokenLong), "token binds to the duration/expiration");
        // Same inputs → same token (local deterministic signing, no provider call).
        require(pdfUrl.equals(generate(cloud, key, secret, "raw", "pilot/authenticated/a", "pdf", 60)),
                "generation is deterministic and local");
        System.out.println("SELFTEST OK (local signing only; no network; no secrets printed)");
    }

    private static String queryParam(String url, String name) {
        int q = url.indexOf('?');
        if (q < 0) {
            return null;
        }
        for (String pair : url.substring(q + 1).split("&")) {
            int eq = pair.indexOf('=');
            if (eq > 0 && pair.substring(0, eq).equals(name)) {
                return pair.substring(eq + 1);
            }
        }
        return null;
    }

    private static String env(String name) {
        String value = System.getenv(name);
        if (value == null || value.isBlank()) {
            fail(name + " is required (test-cloud credential via environment, never argv)");
        }
        return value;
    }

    private static void require(boolean condition, String what) {
        if (!condition) {
            throw new IllegalStateException("self-test failed: " + what);
        }
    }

    private static void fail(String message) {
        System.err.println("authtoken-tool error: " + message);
        System.exit(1);
    }
}
