import { Injectable } from "@nestjs/common";

import { AppExceptions } from "@common/exceptions";
import { OtpChannel, User, UserStatus } from "@generated/client";
import { UserCreateInput } from "@generated/models";

import { UserRepository } from "../repositories/user.repository";

@Injectable()
export class UserPublicService {
    constructor(private readonly userRepo: UserRepository) {}

    /**
     * List the IDs of every active user.
     */
    async listActiveUserIds(): Promise<string[]> {
        return this.userRepo.findIdsBy({ where: { status: UserStatus.ACTIVE } });
    }

    /**
     * List the IDs of users who opted into newsletter broadcasts.
     * Also filters to active users only.
     */
    async listNewsletterSubscriberIds(): Promise<string[]> {
        return this.userRepo.findIdsBy({
            where: { status: UserStatus.ACTIVE, isNewsletterSubscribed: true },
        });
    }

    /**
     * List the IDs of users created at or after the given date.
     * Also filters to active users only.
     */
    async listUserIdsCreatedAfter(date: Date): Promise<string[]> {
        return this.userRepo.findIdsBy({
            where: { status: UserStatus.ACTIVE, createdAt: { gte: date } },
        });
    }

    /**
     * List the IDs of active users holding any of the given role IDs.
     */
    async listUserIdsByRoleIds(roleIds: string[]): Promise<string[]> {
        if (roleIds.length === 0) return [];

        return this.userRepo.findIdsBy({
            where: {
                status: UserStatus.ACTIVE,
                userRoles: { some: { roleId: { in: roleIds } } },
            },
        });
    }

    /**
     * Finds a user by id.
     */
    async findById(id: string): Promise<User | null> {
        return this.userRepo.findById(id);
    }

    /**
     * Finds a single user or throws an error if not found.
     */
    async findByIdOrFail(id: string): Promise<User> {
        const user = await this.userRepo.findById(id);

        if (!user) throw AppExceptions.notFound("User", id);

        return user;
    }

    /**
     * Find by email, phone, or username.
     */
    async findByIdentifier(identifier: string): Promise<User | null> {
        return this.userRepo.findByIdentifier(identifier);
    }

    /**
     * Finds a user by email address.
     */
    async findByEmail(email: string): Promise<User | null> {
        return this.userRepo.findByEmail(email);
    }

    /**
     * Finds a user by phone number.
     */
    async findByPhone(phone: string): Promise<User | null> {
        return this.userRepo.findByPhone(phone);
    }

    /**
     * Finds a user by username.
     */
    async findByUsername(username: string): Promise<User | null> {
        return this.userRepo.findByUsername(username);
    }

    /**
     * Finds a user by their public/QR identifier.
     */
    async findByQrCode(qrCode: string): Promise<User | null> {
        return this.userRepo.findByQrCode(qrCode);
    }

    /**
     * Finds an active user by id.
     */
    async findActiveById(id: string): Promise<User | null> {
        return this.userRepo.findActiveById(id);
    }

    /**
     * Find multiple users by IDs with minimal fields.
     */
    async findManyByIds(
        ids: string[],
    ): Promise<
        Pick<User, "id" | "username" | "email" | "phone" | "displayName" | "firstName" | "lastName" | "avatar">[]
    > {
        return this.userRepo.findManyByIds(ids);
    }

    /**
     * Create a new user through the signup process. QR code is generated internally.
     */
    async createRegisteredUser(data: Omit<UserCreateInput, "qrCode">): Promise<User> {
        return this.userRepo.createRegisteredUser(data);
    }

    /**
     * Update user password hash.
     */
    async updatePasswordHash(id: string, passwordHash: string): Promise<void> {
        return this.userRepo.updatePasswordHash(id, passwordHash);
    }

    /**
     * Update user status for account reactivation, suspension, or deletion.
     */
    async updateStatus(id: string, status: UserStatus, deletionRequestedAt?: Date | null): Promise<void> {
        return this.userRepo.updateStatus(id, status, deletionRequestedAt);
    }

    /**
     * Reactivate a user account. Sets the status to active and clears the deletion request.
     */
    async reactivate(id: string): Promise<void> {
        return this.userRepo.updateStatus(id, UserStatus.ACTIVE, null);
    }

    /**
     * Enable or disable two-factor settings, or change the preferred OTP channel.
     * If a channel is not provided, the current channel is left unchanged.
     */
    async updateTwoFactor(id: string, isTwoFactorOn: boolean, channel?: OtpChannel): Promise<void> {
        return this.userRepo.updateTwoFactor(id, isTwoFactorOn, channel);
    }

    /**
     * Allow user lookup using username, email, phone, first name, or last name.
     */
    async searchUserIdsByTerm(term: string): Promise<string[]> {
        if (!term || term.length < 2) return [];

        return this.userRepo.searchIdsByTerm(term);
    }

    /**
     * Get the count of active users.
     */
    async countActiveUsers(): Promise<number> {
        return this.userRepo.count({ where: { status: UserStatus.ACTIVE } });
    }

    /**
     * Get the count of users who subscribed to the newsletter.
     */
    async countNewsletterSubscribers(): Promise<number> {
        return this.userRepo.count({
            where: { status: UserStatus.ACTIVE, isNewsletterSubscribed: true },
        });
    }

    /**
     * Get the count of new users created after a threshold date.
     */
    async countUsersCreatedAfter(date: Date): Promise<number> {
        return this.userRepo.count({
            where: { status: UserStatus.ACTIVE, createdAt: { gte: date } },
        });
    }
}
