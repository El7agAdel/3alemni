import { Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";

import {
    AccountRestoredEvent,
    LoginSucceededEvent,
    PasswordResetCompletedEvent,
    RegisterCompletedEvent,
    TwoFactorDisabledEvent,
    TwoFactorEnabledEvent,
} from "@common/events";
import { AppExceptions } from "@common/exceptions";
import { PasswordUtil } from "@common/utils";
import { ConfigService } from "@config";
import { OtpChannel, OtpPurpose, User, UserStatus } from "@generated/client";
import { CacheService } from "@infra/cache";
import { LoggingService } from "@infra/logging";
import { RbacPublicService } from "@modules/rbac";
import { UserPublicService } from "@modules/user";
import { OtpService } from "@shared/otp";

import { AuthCacheKeys, TransactionalTokenType } from "../constants/auth.constant";
import {
    ForgotPasswordRequestDto,
    ForgotPasswordResetDto,
    ForgotPasswordVerifyDto,
    LoginTwoFactorDto,
    RegisterCompleteDto,
    RegisterSendOtpDto,
    RegisterValidateDto,
    RegisterVerifyDto,
} from "../dto/requests";
import {
    AuthTokenResult,
    LoginCompleteResult,
    LoginResult,
    LoginTwoFactorPendingResult,
    SessionInfo,
    SessionMetadata,
    TransactionalTokenPayloads,
} from "../interfaces/auth.interface";

import { LoginProtectionService } from "./login-protection.service";
import { SessionService } from "./session.service";
import { TokenService } from "./token.service";

@Injectable()
export class AuthService {
    private readonly signupConfig;

    constructor(
        private readonly config: ConfigService,
        private readonly logger: LoggingService,
        private readonly cache: CacheService,
        private readonly emitter: EventEmitter2,
        private readonly tokenService: TokenService,
        private readonly sessionService: SessionService,
        private readonly loginProtectionService: LoginProtectionService,
        private readonly otpService: OtpService,
        private readonly userPublicService: UserPublicService,
        private readonly rbacPublicService: RbacPublicService,
    ) {
        this.logger.setContext(AuthService.name);

        this.signupConfig = this.config.auth.signup;
    }

    /**
     * First step in the registration flow.
     * Validates identity uniqueness and caches signup data.
     */
    async registerValidate(dto: RegisterValidateDto): Promise<void> {
        const [existingUsername, existingEmail, existingPhone] = await Promise.all([
            this.userPublicService.findByUsername(dto.username),
            this.userPublicService.findByEmail(dto.email),
            this.userPublicService.findByPhone(dto.phone),
        ]);

        if (existingUsername) throw AppExceptions.alreadyExists("User", "username");
        if (existingEmail) throw AppExceptions.alreadyExists("User", "email");
        if (existingPhone) throw AppExceptions.alreadyExists("User", "phone");

        const signupData = {
            username: dto.username,
            email: dto.email,
            phone: dto.phone,
        };

        const ttl = this.signupConfig.pendingTtlSeconds;

        await Promise.all([
            this.cache.set(AuthCacheKeys.REGISTER_PENDING(dto.email), signupData, ttl),
            this.cache.set(AuthCacheKeys.REGISTER_PENDING(dto.phone), signupData, ttl),
        ]);

        this.logger.info("Signup data validated and cached", {
            username: dto.username,
            email: dto.email,
            phone: dto.phone,
        });
    }

    /**
     * Second step in the registration flow.
     * Confirms cached signup data exists and sends an OTP.
     * Returns a transactional token binding the identifier to the channel.
     */
    async registerSendOtp(dto: RegisterSendOtpDto): Promise<{
        transactionalToken: string;
        target: string;
        channel: OtpChannel;
        expiresIn: number;
    }> {
        const cached = await this.cache.get<TransactionalTokenPayloads[TransactionalTokenType.REGISTER_COMPLETE]>(
            AuthCacheKeys.REGISTER_PENDING(dto.identifier),
        );

        if (!cached) throw AppExceptions.signupExpired();

        const result = await this.otpService.send(dto.identifier, OtpPurpose.SIGNUP, dto.channel);

        const transactionalToken = await this.tokenService.createTransactionalToken(
            TransactionalTokenType.REGISTER_OTP_PENDING,
            { identifier: dto.identifier, channel: dto.channel },
        );

        this.logger.info("Signup OTP sent", {
            identifier: dto.identifier,
            channel: dto.channel,
        });

        return {
            transactionalToken,
            target: result.identifier,
            channel: result.channel,
            expiresIn: result.expiresIn,
        };
    }

    /**
     * Third step in the registration flow.
     * Verifies the OTP via its transactional token and issues a new completion token.
     */
    async registerVerify(dto: RegisterVerifyDto): Promise<{ transactionalToken: string }> {
        const { identifier, channel } = await this.tokenService.verifyTransactionalToken(
            dto.transactionalToken,
            TransactionalTokenType.REGISTER_OTP_PENDING,
        );

        const cached = await this.cache.get<TransactionalTokenPayloads[TransactionalTokenType.REGISTER_COMPLETE]>(
            AuthCacheKeys.REGISTER_PENDING(identifier),
        );

        if (!cached) throw AppExceptions.signupExpired();

        await this.otpService.verify(identifier, OtpPurpose.SIGNUP, dto.code);

        await this.tokenService.consumeTransactionalToken(dto.transactionalToken);

        await Promise.all([
            this.cache.delete(AuthCacheKeys.REGISTER_PENDING(cached.email)),
            this.cache.delete(AuthCacheKeys.REGISTER_PENDING(cached.phone)),
        ]);

        const transactionalToken = await this.tokenService.createTransactionalToken(
            TransactionalTokenType.REGISTER_COMPLETE,
            { ...cached, channel },
        );

        this.logger.info("Signup OTP verified, completion token issued");

        return { transactionalToken };
    }

    /**
     * Fourth step in the registration flow.
     * Verifies the completion token, creates the new user, and starts a session.
     */
    async registerComplete(dto: RegisterCompleteDto, metadata: SessionMetadata): Promise<AuthTokenResult> {
        const signupData = await this.tokenService.verifyTransactionalToken(
            dto.transactionalToken,
            TransactionalTokenType.REGISTER_COMPLETE,
        );

        const { username, email, phone, channel } = signupData;

        const passwordHash = await PasswordUtil.hash(dto.password);

        const user = await this.userPublicService.createRegisteredUser({
            username,
            email,
            phone,
            passwordHash,
            otpChannel: channel,
            emailVerifiedAt: channel === OtpChannel.EMAIL ? new Date() : undefined,
            phoneVerifiedAt: channel === OtpChannel.WHATSAPP ? new Date() : undefined,
        });

        // Before the tokens, so the very first request already carries the role's permissions
        await this.rbacPublicService.assignDefaultRole(user.id);

        const { sessionId, refreshToken } = await this.sessionService.create(user.id, metadata);
        const accessToken = await this.tokenService.generateAccessToken(user, sessionId);

        await this.tokenService.consumeTransactionalToken(dto.transactionalToken);

        this.emitter.emit(
            RegisterCompletedEvent.eventName,
            new RegisterCompletedEvent(user.id, user.username, user.email, user.phone),
        );

        this.logger.info("Signup completed", {
            userId: user.id,
            username: user.username,
            email: user.email,
            phone: user.phone,
        });

        return { user, accessToken, refreshToken };
    }

    /**
     * Called by LocalStrategy to check if the user exists and is active.
     * Also enforces login lockout and records invalid password attempts.
     */
    async validateUser(identifier: string, password: string, ip?: string): Promise<User | null> {
        const user = await this.userPublicService.findByIdentifier(identifier);

        if (!user) return null;

        if (user.status === UserStatus.SUSPENDED) {
            throw AppExceptions.accountLocked("Account is suspended");
        }

        await this.loginProtectionService.checkLockout(identifier);

        const isValid = await PasswordUtil.verify(password, user.passwordHash);

        if (!isValid) {
            await this.loginProtectionService.recordFailedAttempt(identifier, ip);

            return null;
        }

        await this.loginProtectionService.clearAttempts(identifier);

        return user;
    }

    /**
     * Handle login after validation is done.
     * Decides whether 2FA is required or completes the login immediately.
     */
    async login(user: User, metadata: SessionMetadata): Promise<LoginResult> {
        let accountRestored = false;

        if (user.status === UserStatus.PENDING_DELETION) {
            await this.userPublicService.reactivate(user.id);

            accountRestored = true;

            this.emitter.emit(AccountRestoredEvent.eventName, new AccountRestoredEvent(user.id));

            this.logger.info("Account reactivated on login", { userId: user.id });
        }

        if (user.isTwoFactorOn) return this.initiateTwoFactor(user, accountRestored);

        return this.completeLogin(user, metadata, accountRestored);
    }

    /**
     * Handle 2FA login after the password step. Validates the transactional token and OTP.
     */
    async loginTwoFactor(dto: LoginTwoFactorDto, metadata: SessionMetadata): Promise<LoginCompleteResult> {
        const { userId, identifier, accountRestored } = await this.tokenService.verifyTransactionalToken(
            dto.transactionalToken,
            TransactionalTokenType.TWO_FACTOR_LOGIN,
        );

        await this.otpService.verify(identifier, OtpPurpose.TWO_FACTOR, dto.code);

        await this.tokenService.consumeTransactionalToken(dto.transactionalToken);

        const user = await this.userPublicService.findActiveById(userId);

        if (!user) throw AppExceptions.notFound("User", userId);

        return this.completeLogin(user, metadata, accountRestored ?? false);
    }

    /**
     * Rotate the session's refresh token and issue a new access token.
     */
    async refreshToken(oldRefreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
        const { sessionId, refreshToken, userId } = await this.sessionService.rotate(oldRefreshToken);

        const user = await this.userPublicService.findActiveById(userId);

        if (!user) throw AppExceptions.notFound("User", userId);

        const accessToken = await this.tokenService.generateAccessToken(user, sessionId);

        return { accessToken, refreshToken };
    }

    /**
     * Logout of a single session. Blacklists the access token to prevent use during its remaining window.
     */
    async logout(userId: string, refreshToken: string): Promise<void> {
        const session = await this.sessionService.findByRefreshToken(refreshToken);

        if (session) {
            await this.sessionService.revoke(session.id, userId);
        }

        this.logger.info("Logout completed", { userId });
    }

    /**
     * Logout of all the user's devices.
     */
    async logoutAll(userId: string, excludeSessionId?: string): Promise<number> {
        const { revokedCount } = await this.sessionService.revokeAll(userId, excludeSessionId);

        this.logger.info("Logout of all devices completed", {
            userId,
            revokedCount,
        });

        return revokedCount;
    }

    /**
     * Get all active sessions for the user, marking the current session if possible.
     */
    async listSessions(userId: string, currentSessionId?: string): Promise<SessionInfo[]> {
        return this.sessionService.listActive(userId, currentSessionId);
    }

    /**
     * Revoke a single session.
     */
    async revokeSession(userId: string, sessionId: string): Promise<void> {
        await this.sessionService.revoke(sessionId, userId);
    }

    /**
     * First step in the password reset flow. Finds the user and sends a verification OTP.
     */
    async forgotPasswordRequest(dto: ForgotPasswordRequestDto): Promise<{
        transactionalToken: string;
        target: string;
        channel: OtpChannel;
        expiresIn: number;
    }> {
        const user = await this.userPublicService.findByIdentifier(dto.identifier);

        if (!user) throw AppExceptions.notFound("User", dto.identifier);

        const result = await this.otpService.send(
            dto.identifier,
            OtpPurpose.PASSWORD_RESET,
            dto.channel,
            user.firstName ?? user.username,
        );

        const transactionalToken = await this.tokenService.createTransactionalToken(
            TransactionalTokenType.PASSWORD_RESET_OTP_PENDING,
            { identifier: dto.identifier, channel: dto.channel, userId: user.id },
        );

        this.logger.info("Password reset OTP sent", {
            userId: user.id,
            identifier: dto.identifier,
            channel: dto.channel,
        });

        return {
            transactionalToken,
            target: result.identifier,
            channel: result.channel,
            expiresIn: result.expiresIn,
        };
    }

    /**
     * Second step in the password reset flow. Verifies the OTP and issues a completion token.
     */
    async forgotPasswordVerify(dto: ForgotPasswordVerifyDto): Promise<{ transactionalToken: string }> {
        const { identifier, userId } = await this.tokenService.verifyTransactionalToken(
            dto.transactionalToken,
            TransactionalTokenType.PASSWORD_RESET_OTP_PENDING,
        );

        await this.otpService.verify(identifier, OtpPurpose.PASSWORD_RESET, dto.code);

        await this.tokenService.consumeTransactionalToken(dto.transactionalToken);

        const transactionalToken = await this.tokenService.createTransactionalToken(
            TransactionalTokenType.PASSWORD_RESET_COMPLETE,
            { userId },
        );

        this.logger.info("Password reset OTP verified", { userId });

        return { transactionalToken };
    }

    /**
     * Third step in the password reset flow. Verifies the completion token and updates the password.
     */
    async forgotPasswordReset(dto: ForgotPasswordResetDto): Promise<void> {
        const { userId } = await this.tokenService.verifyTransactionalToken(
            dto.transactionalToken,
            TransactionalTokenType.PASSWORD_RESET_COMPLETE,
        );

        const passwordHash = await PasswordUtil.hash(dto.newPassword);
        await this.userPublicService.updatePasswordHash(userId, passwordHash);

        await this.tokenService.consumeTransactionalToken(dto.transactionalToken);

        const { revokedCount } = await this.sessionService.revokeAll(userId);

        this.emitter.emit(PasswordResetCompletedEvent.eventName, new PasswordResetCompletedEvent(userId, revokedCount));

        this.logger.info("Password reset completed", {
            userId,
            revokedSessions: revokedCount,
        });
    }

    /**
     * Enable 2FA on the user account. Requires a verification OTP on the user's preferred channel.
     */
    async enableTwoFactorRequest(
        userId: string,
        channel: OtpChannel,
    ): Promise<{ channel: OtpChannel; expiresIn: number; target: string }> {
        const user = await this.userPublicService.findActiveById(userId);

        if (!user) throw AppExceptions.notFound("User", userId);

        if (user.isTwoFactorOn) {
            throw AppExceptions.conflict("Two-factor authentication is already enabled");
        }

        if (channel === OtpChannel.EMAIL && !user.emailVerifiedAt) {
            throw AppExceptions.badRequest("Email must be verified before enabling 2FA", {
                channel: OtpChannel.EMAIL,
            });
        }

        if (channel === OtpChannel.WHATSAPP && !user.phoneVerifiedAt) {
            throw AppExceptions.badRequest("Phone must be verified before enabling 2FA", {
                channel: OtpChannel.WHATSAPP,
            });
        }

        const identifier = channel === OtpChannel.EMAIL ? user.email : user.phone;
        const result = await this.otpService.send(
            identifier,
            OtpPurpose.TWO_FACTOR,
            channel,
            user.firstName ?? user.username,
        );

        this.logger.info("2FA setup OTP sent", { userId });

        return {
            target: result.identifier,
            channel: result.channel,
            expiresIn: result.expiresIn,
        };
    }

    /**
     * Verify the OTP sent to enable 2FA.
     */
    async enableTwoFactorVerify(userId: string, code: string, channel: OtpChannel): Promise<void> {
        const user = await this.userPublicService.findActiveById(userId);

        if (!user) throw AppExceptions.notFound("User", userId);

        const identifier = channel === OtpChannel.EMAIL ? user.email : user.phone;
        await this.otpService.verify(identifier, OtpPurpose.TWO_FACTOR, code);

        await this.userPublicService.updateTwoFactor(userId, true, channel);

        this.emitter.emit(TwoFactorEnabledEvent.eventName, new TwoFactorEnabledEvent(userId, channel));

        this.logger.info("2FA enabled", { userId, identifier, channel });
    }

    /**
     * Disable 2FA on a user account.
     */
    async disableTwoFactor(userId: string): Promise<void> {
        const user = await this.userPublicService.findById(userId);

        if (!user) throw AppExceptions.notFound("User", userId);

        if (!user.isTwoFactorOn) {
            throw AppExceptions.conflict("Two-factor authentication is not enabled");
        }

        await this.userPublicService.updateTwoFactor(userId, false);

        this.emitter.emit(TwoFactorDisabledEvent.eventName, new TwoFactorDisabledEvent(userId));

        this.logger.info("2FA disabled", { userId });
    }

    /**
     * Start the 2FA challenge: send an OTP on the user's channel and issue a binding transactional token.
     */
    private async initiateTwoFactor(
        user: User,
        accountRestored: boolean = false,
    ): Promise<LoginTwoFactorPendingResult> {
        const channel = user.otpChannel;
        const identifier = channel === OtpChannel.EMAIL ? user.email : user.phone;

        await this.otpService.send(identifier, OtpPurpose.TWO_FACTOR, channel, user.firstName ?? user.username);

        const transactionalToken = await this.tokenService.createTransactionalToken(
            TransactionalTokenType.TWO_FACTOR_LOGIN,
            { userId: user.id, identifier, accountRestored },
        );

        this.logger.info("2FA challenge initiated", { userId: user.id });

        return {
            twoFactorRequired: true,
            accountRestored,
            transactionalToken,
            channel,
        };
    }

    /**
     * Complete the login process by creating a new session and issuing an access token.
     */
    private async completeLogin(
        user: User,
        metadata: SessionMetadata,
        accountRestored: boolean = false,
    ): Promise<LoginCompleteResult> {
        const { sessionId, refreshToken } = await this.sessionService.create(user.id, metadata);
        const accessToken = await this.tokenService.generateAccessToken(user, sessionId);

        this.emitter.emit(
            LoginSucceededEvent.eventName,
            new LoginSucceededEvent(user.id, sessionId, metadata.ipAddress ?? null, metadata.deviceType ?? null),
        );

        this.logger.info("Login completed", { userId: user.id, sessionId });

        return {
            twoFactorRequired: false,
            accountRestored,
            user,
            accessToken,
            refreshToken,
        };
    }
}
