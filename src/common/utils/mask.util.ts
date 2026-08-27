export class MaskUtil {
    /**
     * Mask email leave 2 characters and hide the rest.
     * Handles some edge cases as well, like invalid or short email.
     */
    static email(email: string): string {
        const [local, domain] = email.split("@");

        if (!domain) return "***";

        const showLength = Math.min(2, Math.floor(local.length / 2));

        if (showLength === 0) return `***@${domain}`;

        return `${local.substring(0, showLength)}***@${domain}`;
    }

    /**
     * Mask the phone number by leaving the last 4 digits and hiding the rest.
     */
    static phone(phone: string): string {
        return `***${phone.slice(-4)}`;
    }

    /**
     * Auto-detect and mask based on format.
     * Check for an email pattern or phone.
     */
    static auto(identifier: string): string {
        return identifier.includes("@") ? MaskUtil.email(identifier) : MaskUtil.phone(identifier);
    }
}
