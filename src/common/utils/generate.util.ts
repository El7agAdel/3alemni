import * as crypto from "node:crypto";

import { appUpper } from "@common/constants";

export class GenerateUtil {
    /**
     * Generate random digits.
     */
    static randomDigits(length = 6): string {
        if (length < 1 || length > 18) {
            throw new Error("Length must be between 1 and 18");
        }

        const min = Math.pow(10, length - 1);
        const max = Math.pow(10, length);

        return crypto.randomInt(min, max).toString();
    }

    /**
     * Generate a random alphanumeric string.
     */
    static randomString(length = 6): string {
        return crypto
            .randomBytes(Math.ceil(length / 2))
            .toString("hex")
            .slice(0, length);
    }

    /**
     * Generate a unique public/QR identifier.
     */
    static qrCode(): string {
        return `${appUpper()}-${crypto.randomBytes(32).toString("base64url")}`;
    }
}
