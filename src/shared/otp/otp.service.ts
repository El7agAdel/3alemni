import { Injectable } from "@nestjs/common";
import * as crypto from "crypto";

import { AppExceptions } from "@common/exceptions";
import { GenerateUtil, MaskUtil } from "@common/utils";
import { ConfigService } from "@config";
import { OtpChannel, OtpPurpose } from "@generated/client";
import { CacheService } from "@infra/cache";
import { LoggingService } from "@infra/logging";
import { EmailService, OtpEmail, OtpTemplate, WhatsAppService } from "@shared/messaging";

import { OtpCacheKeys } from "./otp.constant";
import { OtpRepository } from "./otp.repository";

@Injectable()
export class OtpService {
    private readonly otpConfig;

    constructor(
        private readonly cache: CacheService,
        private readonly config: ConfigService,
        private readonly logger: LoggingService,
        private readonly otpRepo: OtpRepository,
        private readonly emailService: EmailService,
        private readonly whatsAppService: WhatsAppService,
    ) {
        this.logger.setContext(OtpService.name);

        this.otpConfig = config.auth.otp;
    }

    /**
     * Generate and send an OTP.
     * Checks rate limits, invalidates previous OTPs, generates a new OTP, and queues delivery.
     * Handles both the initial send and resend.
     */
    async send(identifier: string, purpose: OtpPurpose, channel: OtpChannel, recipientName?: string) {
        if (channel === OtpChannel.WHATSAPP && !this.config.communication.whatsapp.enabled) {
            throw AppExceptions.badRequest("WhatsApp delivery is not enabled");
        }

        // Check rate limit
        const rateLimitWindow = this.otpConfig.rateLimitWindowSeconds;
        const rateKey = OtpCacheKeys.RATE(identifier);
        const requestCount = await this.cache.increment(rateKey, rateLimitWindow);

        if (requestCount > this.otpConfig.maxRequestsPerWindow) {
            throw AppExceptions.otpRateLimitExceeded({
                retryAfter: await this.cache.getTTL(rateKey),
                limit: this.otpConfig.maxRequestsPerWindow,
            });
        }

        // Invalidate previous OTPs
        await this.otpRepo.invalidateAll(identifier, purpose);

        // Generate OTP code
        const code = GenerateUtil.randomDigits(this.otpConfig.length);
        const hashedCode = this.hashCode(code);
        const expiresAt = new Date(Date.now() + this.otpConfig.expirySeconds * 1000);

        // Store OTP
        const otp = await this.otpRepo.create({
            identifier,
            purpose,
            channel,
            code: hashedCode,
            expiresAt,
        });

        // Queue OTP delivery
        if (channel === OtpChannel.EMAIL) {
            const email = new OtpEmail({
                otp: code,
                expiryMinutes: Math.floor(this.otpConfig.expirySeconds / 60),
                purpose,
                recipientName,
            });

            await this.emailService.queue(identifier, email);
        } else {
            const template = new OtpTemplate({ otp: code });

            await this.whatsAppService.queue(identifier, template);
        }

        const maskedTarget = MaskUtil.auto(identifier);

        this.logger.info("OTP sent", {
            otpId: otp.id,
            identifier,
            purpose,
            channel,
        });

        return {
            otpId: otp.id,
            identifier: maskedTarget,
            channel,
            expiresIn: this.otpConfig.expirySeconds,
        };
    }

    /**
     * Check if the OTP is valid and not expired.
     * Checks for lockouts and resets counters on success.
     */
    async verify(identifier: string, purpose: OtpPurpose, code: string): Promise<void> {
        const lockoutKey = OtpCacheKeys.LOCKOUT(identifier, purpose);
        const failKey = OtpCacheKeys.FAIL(identifier, purpose);
        const rateKey = OtpCacheKeys.RATE(identifier);

        const isLockedOut = await this.cache.exists(lockoutKey);

        if (isLockedOut) {
            const retryAfter = await this.cache.getTTL(lockoutKey);

            throw AppExceptions.otpLockedOut(retryAfter);
        }

        const otp = await this.otpRepo.findLatestActive(identifier, purpose);

        if (!otp) throw AppExceptions.otpInvalid();

        const hashedInput = this.hashCode(code);
        const isValid = crypto.timingSafeEqual(Buffer.from(hashedInput), Buffer.from(otp.code));

        if (!isValid) {
            const failCount = await this.cache.increment(failKey, 3600);

            if (failCount >= this.otpConfig.maxFailedAttempts) {
                await this.cache.set(lockoutKey, true, this.otpConfig.lockoutSeconds);
                await this.cache.delete(failKey);

                throw AppExceptions.otpLockedOut(this.otpConfig.lockoutSeconds);
            }

            throw AppExceptions.otpInvalid();
        }

        await this.otpRepo.markUsed(otp.id);

        // Clear failure and rate limit keys on success
        await this.cache.delete(failKey);
        await this.cache.delete(rateKey);

        this.logger.info("OTP verified", {
            otpId: otp.id,
            identifier,
            purpose,
        });
    }

    /**
     * Check if the identifier is rate-limited.
     */
    async isRateLimited(identifier: string): Promise<boolean> {
        const rateKey = OtpCacheKeys.RATE(identifier);

        const count = await this.cache.get<number>(rateKey);

        return count !== null && count >= this.otpConfig.maxRequestsPerWindow;
    }

    /**
     * Check if the identifier is locked out for a specific purpose.
     */
    async isLockedOut(identifier: string, purpose: OtpPurpose): Promise<boolean> {
        const lockoutKey = OtpCacheKeys.LOCKOUT(identifier, purpose);

        return this.cache.exists(lockoutKey);
    }

    /**
     * Delete all expired OTPs.
     */
    async cleanupExpired(): Promise<number> {
        return this.otpRepo.deleteExpired();
    }

    /**
     * Delete used OTPs older than a given date.
     */
    async cleanupUsedBefore(date: Date): Promise<number> {
        return this.otpRepo.deleteUsedBefore(date);
    }

    /**
     * Hash the OTP code. Never store or log the plaintext code.
     */
    private hashCode(code: string): string {
        return crypto.createHash("sha256").update(code).digest("hex");
    }
}
