import type { ConfigService } from "@config";

export class UploadUtil {
    private static baseUrl: string;

    /**
     * Must be called once on app startup (see UploadModule).
     * DTOs are plain classes and can't inject ConfigService, so the base URL is cached statically here.
     * Trailing slashes are stripped to avoid double-slash URLs.
     */
    static initialize(config: ConfigService["storage"]): void {
        UploadUtil.baseUrl = config.baseUrl.replace(/\/+$/, "");
    }

    /**
     * Resolve a storage key into a full URL.
     */
    static resolveUrl(key: string): string {
        if (!key) return "";

        return `${UploadUtil.baseUrl}/${key}`;
    }

    /**
     * Normalize a client-provided value to a storage key.
     * Accepts either a key or a full resolved URL and returns the key only.
     */
    static extractKey(input: string | null | undefined): string {
        if (!input) return "";

        const prefix = `${UploadUtil.baseUrl}/`;

        if (UploadUtil.baseUrl && input.startsWith(prefix)) {
            return input.slice(prefix.length);
        }

        return input;
    }
}
