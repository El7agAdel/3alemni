import { Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";

import {
    EmailChangedEvent,
    EmailVerifiedEvent,
    PasswordChangedEvent,
    PhoneChangedEvent,
    PhoneVerifiedEvent,
    UserDeletionRequestedEvent,
} from "@common/events";
import { AppExceptions } from "@common/exceptions";
import { PasswordUtil } from "@common/utils";
import { ConfigService } from "@config";
import { OtpChannel, OtpPurpose, User, UserStatus } from "@generated/client";
import { CacheService } from "@infra/cache";
import { LoggingService } from "@infra/logging";
import { UploadPublicService } from "@modules/upload";
import { UploadPurpose } from "@modules/upload/constants";
import { OtpService } from "@shared/otp";

import { UserCacheKeys } from "../constants";
import { UpdateProfileDto } from "../dto/requests";
import { UserRepository } from "../repositories/user.repository";

@Injectable()
export class MeService {
    constructor(
        private readonly logger: LoggingService,
        private readonly cache: CacheService,
        private readonly config: ConfigService,
        private readonly userRepo: UserRepository,
        private readonly uploadPublic: UploadPublicService,
        private readonly otpService: OtpService,
        private readonly emitter: EventEmitter2,
    ) {
        this.logger.setContext(MeService.name);
    }

    /**
     * Get the current user's profile.
     */
    async getProfile(userId: string): Promise<User> {
        const user = await this.userRepo.findById(userId);

        if (!user) throw AppExceptions.notFound("User", userId);

        return user;
    }

    /**
     * Update the current user's profile. Only allowed fields are updated.
     */
    async updateProfile(userId: string, data: UpdateProfileDto): Promise<User> {
        const user = await this.userRepo.findById(userId);

        if (!user) throw AppExceptions.notFound("User", userId);

        if (data.avatar !== undefined) {
            await this.uploadPublic.replace(user.avatar, data.avatar, UploadPurpose.USER_AVATAR, userId);
        }

        return this.userRepo.updateProfile(userId, data);
    }

    /**
     * Change the current user's password. Doesn't allow reusing the current password.
     */
    async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
        const user = await this.userRepo.findById(userId);

        if (!user) throw AppExceptions.notFound("User", userId);

        const isValid = await PasswordUtil.verify(currentPassword, user.passwordHash);

        if (!isValid) {
            throw AppExceptions.invalidCredentials();
        }

        const isSame = await PasswordUtil.verify(newPassword, user.passwordHash);

        if (isSame) throw AppExceptions.passwordUnchanged();

        const passwordHash = await PasswordUtil.hash(newPassword);

        await this.userRepo.updatePasswordHash(userId, passwordHash);

        this.emitter.emit(PasswordChangedEvent.eventName, new PasswordChangedEvent(userId));
    }

    /**
     * Request an email change. Sends an OTP to the new email.
     * The route requires recent re-authentication.
     */
    async changeEmail(
        userId: string,
        newEmail: string,
    ): Promise<{
        target: string;
        channel: OtpChannel;
        expiresIn: number;
    }> {
        const user = await this.userRepo.findById(userId);

        if (!user) throw AppExceptions.notFound("User", userId);

        if (user.email === newEmail) throw AppExceptions.sameAsCurrentEmail();

        const existing = await this.userRepo.findByEmail(newEmail);

        if (existing) throw AppExceptions.alreadyExists("User", "email");

        const cacheKey = UserCacheKeys.PENDING_EMAIL_CHANGE(userId);
        await this.cache.set(cacheKey, newEmail, 900);

        const result = await this.otpService.send(
            newEmail,
            OtpPurpose.CHANGE_EMAIL,
            OtpChannel.EMAIL,
            user.firstName ?? user.username,
        );

        this.logger.info("Change email OTP sent", { userId, newEmail });

        return {
            target: result.identifier,
            channel: result.channel,
            expiresIn: result.expiresIn,
        };
    }

    /**
     * Verify email change with an OTP.
     */
    async confirmEmailChange(userId: string, code: string): Promise<void> {
        const cacheKey = UserCacheKeys.PENDING_EMAIL_CHANGE(userId);
        const newEmail = await this.cache.get<string>(cacheKey);

        if (!newEmail) throw AppExceptions.noPendingChange("email");

        await this.otpService.verify(newEmail, OtpPurpose.CHANGE_EMAIL, code);

        const existing = await this.userRepo.findByEmail(newEmail);

        if (existing && existing.id !== userId) {
            throw AppExceptions.alreadyExists("User", "email");
        }

        const user = await this.userRepo.findById(userId);
        const oldEmail = user!.email;

        await this.userRepo.updateEmail(userId, newEmail);
        await this.userRepo.setEmailVerified(userId);

        await this.cache.delete(cacheKey);

        this.emitter.emit(EmailChangedEvent.eventName, new EmailChangedEvent(userId, oldEmail, newEmail));

        this.logger.info("User email changed", { userId, oldEmail, newEmail });
    }

    /**
     * Request a phone change. Sends an OTP to the new phone.
     * The route requires recent re-authentication.
     */
    async changePhone(
        userId: string,
        newPhone: string,
    ): Promise<{ target: string; channel: OtpChannel; expiresIn: number }> {
        const user = await this.userRepo.findById(userId);

        if (!user) throw AppExceptions.notFound("User", userId);

        if (user.phone === newPhone) throw AppExceptions.sameAsCurrentPhone();

        const existing = await this.userRepo.findByPhone(newPhone);

        if (existing) throw AppExceptions.alreadyExists("User", "phone");

        const cacheKey = UserCacheKeys.PENDING_PHONE_CHANGE(userId);
        await this.cache.set(cacheKey, newPhone, 900);

        const result = await this.otpService.send(
            newPhone,
            OtpPurpose.CHANGE_PHONE,
            OtpChannel.WHATSAPP,
            user.firstName ?? user.username,
        );

        this.logger.info("Change phone OTP sent", { userId, newPhone });

        return {
            target: result.identifier,
            channel: result.channel,
            expiresIn: result.expiresIn,
        };
    }

    /**
     * Verify phone change with an OTP.
     */
    async confirmPhoneChange(userId: string, code: string): Promise<void> {
        const cacheKey = UserCacheKeys.PENDING_PHONE_CHANGE(userId);
        const newPhone = await this.cache.get<string>(cacheKey);

        if (!newPhone) throw AppExceptions.noPendingChange("phone");

        await this.otpService.verify(newPhone, OtpPurpose.CHANGE_PHONE, code);

        const existing = await this.userRepo.findByPhone(newPhone);

        if (existing && existing.id !== userId) {
            throw AppExceptions.alreadyExists("User", "phone");
        }

        const user = await this.userRepo.findById(userId);
        const oldPhone = user!.phone;

        await this.userRepo.updatePhone(userId, newPhone);
        await this.userRepo.setPhoneVerified(userId);

        await this.cache.delete(cacheKey);

        this.emitter.emit(PhoneChangedEvent.eventName, new PhoneChangedEvent(userId, oldPhone, newPhone));

        this.logger.info("User phone changed", { userId, oldPhone, newPhone });
    }

    /**
     * Start the verification process for the user's current email.
     */
    async verifyEmail(userId: string): Promise<{ target: string; channel: OtpChannel; expiresIn: number }> {
        const user = await this.userRepo.findById(userId);

        if (!user) throw AppExceptions.notFound("User", userId);

        if (user.emailVerifiedAt) throw AppExceptions.conflict("Email is already verified");

        const result = await this.otpService.send(
            user.email,
            OtpPurpose.VERIFY_EMAIL,
            OtpChannel.EMAIL,
            user.firstName ?? user.username,
        );

        this.logger.info("Email OTP verification sent", {
            userId,
            email: user.email,
        });

        return {
            target: result.identifier,
            channel: result.channel,
            expiresIn: result.expiresIn,
        };
    }

    /**
     * Confirm email verification by checking the OTP.
     */
    async confirmEmailVerification(userId: string, code: string): Promise<void> {
        const user = await this.userRepo.findById(userId);

        if (!user) throw AppExceptions.notFound("User", userId);

        await this.otpService.verify(user.email, OtpPurpose.VERIFY_EMAIL, code);
        await this.userRepo.setEmailVerified(userId);

        this.emitter.emit(EmailVerifiedEvent.eventName, new EmailVerifiedEvent(userId, user.email));

        this.logger.info("Email verified", { userId, email: user.email });
    }

    /**
     * Start the verification process for the user's current phone.
     */
    async verifyPhone(userId: string): Promise<{ target: string; channel: OtpChannel; expiresIn: number }> {
        const user = await this.userRepo.findById(userId);

        if (!user) throw AppExceptions.notFound("User", userId);

        if (user.phoneVerifiedAt) throw AppExceptions.conflict("Phone is already verified");

        const result = await this.otpService.send(
            user.phone,
            OtpPurpose.VERIFY_PHONE,
            OtpChannel.WHATSAPP,
            user.firstName ?? user.username,
        );

        this.logger.info("Phone OTP verification sent", {
            userId,
            phone: user.phone,
        });

        return {
            target: result.identifier,
            channel: result.channel,
            expiresIn: result.expiresIn,
        };
    }

    /**
     * Confirm phone verification by checking the OTP.
     */
    async confirmPhoneVerification(userId: string, code: string): Promise<void> {
        const user = await this.userRepo.findById(userId);

        if (!user) throw AppExceptions.notFound("User", userId);

        await this.otpService.verify(user.phone, OtpPurpose.VERIFY_PHONE, code);
        await this.userRepo.setPhoneVerified(userId);

        this.emitter.emit(PhoneVerifiedEvent.eventName, new PhoneVerifiedEvent(userId, user.phone));

        this.logger.info("Phone verified", { userId, phone: user.phone });
    }

    /**
     * Request the account to be deleted.
     * The route requires recent re-authentication.
     * Marks the account as pending deletion; a cleanup job permanently deletes it after the grace period.
     */
    async requestDeletion(userId: string): Promise<{ scheduledAt: Date }> {
        const user = await this.userRepo.findById(userId);

        if (!user) throw AppExceptions.notFound("User", userId);

        if (user.status === UserStatus.PENDING_DELETION) {
            throw AppExceptions.deletionAlreadyRequested();
        }

        const scheduledAt = new Date();
        scheduledAt.setDate(scheduledAt.getDate() + this.config.auth.accountDeletion.gracePeriodDays);

        await this.userRepo.updateStatus(userId, UserStatus.PENDING_DELETION, new Date());

        this.emitter.emit(UserDeletionRequestedEvent.eventName, new UserDeletionRequestedEvent(userId, scheduledAt));

        this.logger.info("User requested account deletion", {
            userId: user.id,
            scheduledAt,
        });

        return { scheduledAt };
    }
}
