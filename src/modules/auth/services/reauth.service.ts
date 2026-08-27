import { Injectable } from "@nestjs/common";

import { AppExceptions } from "@common/exceptions";
import { PasswordUtil } from "@common/utils";
import { ConfigService } from "@config";
import { OtpChannel, OtpPurpose } from "@generated/enums";
import { CacheService } from "@infra/cache";
import { LoggingService } from "@infra/logging";
import { UserPublicService } from "@modules/user";
import { OtpService } from "@shared/otp";

import { ReAuthCacheKeys } from "../constants/auth.constant";

@Injectable()
export class ReAuthService {
    private readonly windowSeconds: number;
    private readonly loginConfig;

    constructor(
        private readonly cache: CacheService,
        private readonly config: ConfigService,
        private readonly logger: LoggingService,
        private readonly otpService: OtpService,
        private readonly userPublicService: UserPublicService,
    ) {
        this.logger.setContext(ReAuthService.name);

        this.windowSeconds = this.config.auth.reAuth.windowSeconds;
        this.loginConfig = this.config.auth.login;
    }

    /**
     * Request an OTP for re-authentication, sent to the user's default 2FA channel.
     */
    async requestOtp(userId: string): Promise<{ target: string; channel: OtpChannel; expiresIn: number }> {
        const user = await this.userPublicService.findActiveById(userId);

        if (!user) throw AppExceptions.notFound("User", userId);

        const channel = user.otpChannel;
        const identifier = channel === OtpChannel.EMAIL ? user.email : user.phone;

        const result = await this.otpService.send(
            identifier,
            OtpPurpose.REAUTH,
            channel,
            user.firstName ?? user.username,
        );

        this.logger.info("ReAuth OTP sent", { userId, identifier, channel });

        return {
            target: result.identifier,
            channel: result.channel,
            expiresIn: result.expiresIn,
        };
    }

    /**
     * Verify re-authentication with a password.
     * Sets the re-auth window in the cache, marking sensitive actions safe for the grace period.
     */
    async verifyWithPassword(userId: string, password: string): Promise<void> {
        const attemptsKey = ReAuthCacheKeys.PASSWORD_ATTEMPTS(userId);
        const lockoutKey = ReAuthCacheKeys.PASSWORD_LOCKOUT(userId);

        const isLocked = await this.cache.exists(lockoutKey);

        if (isLocked) {
            const ttl = await this.cache.getTTL(lockoutKey);

            throw AppExceptions.loginLocked(ttl);
        }

        const user = await this.userPublicService.findById(userId);

        if (!user) throw AppExceptions.invalidCredentials();

        const isValid = await PasswordUtil.verify(password, user.passwordHash);

        if (!isValid) {
            const failCount = await this.cache.increment(attemptsKey, 900);

            if (failCount >= this.loginConfig.failuresBeforeLockout) {
                await this.cache.set(lockoutKey, true, this.loginConfig.baseLockoutSeconds);
                await this.cache.delete(attemptsKey);

                throw AppExceptions.accountLocked("Too many failed attempts. Try again in 15 minutes");
            }

            throw AppExceptions.invalidCredentials();
        }

        await this.cache.delete(attemptsKey);

        await this.setReAuthWindow(userId);

        this.logger.info("ReAuth verified via password", { userId });
    }

    /**
     * Verify re-authentication with an OTP code.
     * Sets the re-auth window in the cache, marking sensitive actions safe for the grace period.
     */
    async verifyWithOtp(userId: string, code: string): Promise<void> {
        const user = await this.userPublicService.findActiveById(userId);

        if (!user) throw AppExceptions.notFound("User", userId);

        const identifier = user.otpChannel === OtpChannel.EMAIL ? user.email : user.phone;

        await this.otpService.verify(identifier, OtpPurpose.REAUTH, code);

        await this.setReAuthWindow(userId);

        this.logger.info("ReAuth verified via OTP", { userId, identifier });
    }

    /**
     * Set the re-auth window in the cache.
     */
    private async setReAuthWindow(userId: string): Promise<void> {
        const windowKey = ReAuthCacheKeys.WINDOW(userId);
        const timestamp = Math.floor(Date.now() / 1000);

        await this.cache.set(windowKey, timestamp, this.windowSeconds);
    }
}
