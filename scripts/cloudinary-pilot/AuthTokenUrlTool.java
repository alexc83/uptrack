import com.cloudinary.AuthToken;
import com.cloudinary.Cloudinary;
import com.cloudinary.Url;
import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;

/** Local SDK signing only. Stdout URL is sensitive: caller must capture it, never log it.
 * Uses UpTrack's SDK/type/resource/secure/TTL construction. Explicit corrections to the merged
 * signer: keyed AuthToken, signed(true), ACL equal to actual delivery path (cloud + extension).
 * The token-auth key is provisioned by Cloudinary, NOT the API secret. No provider I/O here.
 */
public final class AuthTokenUrlTool {
    private AuthTokenUrlTool() { }

    public static void main(String[] args) {
        try {
            if (args.length == 1 && args[0].equals("--self-test")) {
                selfTest();
                System.out.println("SELFTEST PASS (offline SDK signing; no provider authorization established)");
                return;
            }
            Map<String, String> options = new HashMap<>();
            for (int i = 0; i < args.length; i += 2) {
                require(i + 1 < args.length &&
                        java.util.Set.of("--resource-type", "--public-id", "--duration").contains(args[i]) &&
                        !options.containsKey(args[i]), "invalid arguments");
                options.put(args[i], args[i + 1]);
            }
            int duration = Integer.parseInt(options.getOrDefault("--duration", "60"));
            System.out.println(generate(env("CLOUDINARY_CLOUD_NAME"), env("CLOUDINARY_API_KEY"),
                    env("CLOUDINARY_API_SECRET"), env("CLOUDINARY_AUTH_TOKEN_KEY"),
                    options.get("--resource-type"), options.get("--public-id"), duration));
        } catch (Exception exception) {
            // SDK exceptions can contain signing inputs; never print them or a stack trace.
            System.err.println("AuthToken helper failed (invalid inputs or SDK signing configuration)");
            System.exit(1);
        }
    }

    static Cloudinary cloudinary(String cloud, String key, String secret) {
        return new Cloudinary(Map.of("cloud_name", cloud, "api_key", key, "api_secret", secret));
    }

    static String generate(String cloud, String key, String secret, String tokenKey,
                           String resource, String publicId, int ttl) {
        require(cloud != null && cloud.matches("[a-zA-Z0-9_-]{1,100}"), "invalid cloud");
        require("raw".equals(resource) || "image".equals(resource), "invalid resource");
        require(publicId != null && publicId.matches("pilot/[a-zA-Z0-9_./-]+") &&
                !publicId.contains("..") && !publicId.contains("//"), "invalid public id");
        require(ttl >= 2 && ttl <= 3600, "invalid TTL");
        require(tokenKey != null && tokenKey.matches("(?:[0-9a-fA-F]{2}){16,64}"), "invalid token key");
        Cloudinary sdk = cloudinary(cloud, key, secret);
        Url unsigned = sdk.url().secure(true).type("authenticated").resourceType(resource);
        // Raw public_id already includes .pdf (provider identity). Image identity excludes .png.
        if ("image".equals(resource)) unsigned.format("png");
        String path = URI.create(unsigned.generate(publicId)).getRawPath();
        AuthToken token = new AuthToken(tokenKey).duration(ttl).acl(path);
        Url signed = sdk.url().secure(true).signed(true).type("authenticated")
                .resourceType(resource).authToken(token);
        if ("image".equals(resource)) signed.format("png");
        return signed.generate(publicId);
    }

    private static String token(String url) {
        String query = URI.create(url).getRawQuery();
        require(query != null && query.startsWith("__cld_token__="), "missing token");
        return URLDecoder.decode(query.substring("__cld_token__=".length()), StandardCharsets.UTF_8);
    }

    private static void selfTest() {
        String cloud = "local-fixture-cloud", key = "local-fixture-key", secret = "local-fixture-api-secret";
        // Public synthetic test vector, never a provisioned credential.
        String tokenKey = "0123456789abcdef0123456789abcdef";
        for (String resource : new String[]{"raw", "image"}) {
            String id = "pilot/offline/" + resource + (resource.equals("raw") ? ".pdf" : "");
            long before = System.currentTimeMillis() / 1000;
            String url = generate(cloud, key, secret, tokenKey, resource, id, 60);
            String t = token(url);
            String path = URI.create(url).getRawPath();
            require(path.equals("/" + cloud + "/" + resource + "/authenticated/v1/" + id +
                    (resource.equals("image") ? ".png" : "")), "SDK path mismatch");
            require(t.contains("acl=" + path + "~hmac="), "ACL must exactly match delivery path");
            long expiry = Long.parseLong(t.substring(4, t.indexOf('~')));
            require(expiry >= before + 60 && expiry <= System.currentTimeMillis() / 1000 + 60, "TTL mismatch");
            // Recompute a fixed-expiry HMAC with the SDK, avoiding clock-boundary flaky assertions.
            String fixed = new AuthToken(tokenKey).expiration(expiry).acl(path).generate();
            require(URLDecoder.decode(fixed, StandardCharsets.UTF_8).equals("__cld_token__=" + t), "SDK HMAC mismatch");
            String otherId = resource.equals("raw") ? "pilot/offline/raw-other.pdf" : id + "-other";
            String other = generate(cloud, key, secret, tokenKey, resource, otherId, 60);
            require(!token(other).equals(t), "cross-asset token must differ");
            String longer = token(generate(cloud, key, secret, tokenKey, resource, id, 120));
            require(Long.parseLong(longer.split("~")[0].substring(4)) >= expiry + 60, "TTL sensitivity");
            require(!url.contains(secret) && !url.contains(tokenKey), "key disclosure");
        }
        // Pin the exact merged UpTrack signer defect without changing application code.
        String backendShape = cloudinary(cloud, key, secret).url().secure(true).type("authenticated")
                .resourceType("raw").authToken(new AuthToken().duration(60)
                        .acl("/raw/authenticated/pilot/offline/raw")).format("pdf").generate("pilot/offline/raw");
        require(!backendShape.contains("__cld_token__="), "recheck merged signer finding");
    }

    private static String env(String key) {
        String value = System.getenv(key);
        require(value != null && !value.isBlank(), "missing environment");
        return value;
    }

    private static void require(boolean condition, String message) {
        if (!condition) throw new IllegalArgumentException(message);
    }
}
