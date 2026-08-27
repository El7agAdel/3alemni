import { OtpPurpose } from "@generated/client";

export const OtpCacheKeys = {
    RATE: (identifier: string) => `otp:rate:${identifier}`,

    FAIL: (identifier: string, purpose: OtpPurpose) => `otp:fail:${identifier}:${purpose}`,

    LOCKOUT: (identifier: string, purpose: OtpPurpose) => `otp:lockout:${identifier}:${purpose}`,
};
