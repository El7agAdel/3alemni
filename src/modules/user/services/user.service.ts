import { Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";

import {
    AdminEmailChangedEvent,
    AdminPhoneChangedEvent,
    AdminUserCreatedEvent,
    AdminUserDeletedEvent,
    AdminUserUpdatedEvent,
    UserForceLogoutEvent,
    UserSuspendedByAdminEvent,
    UserUnsuspendedByAdminEvent,
} from "@common/events";
import { AppExceptions, DomainExceptions } from "@common/exceptions";
import { AuthenticatedUser, ListQueryOptions, PaginatedResult, QueryOptions } from "@common/interfaces";
import { ObjectUtil, PasswordUtil, QueryBuilderUtil } from "@common/utils";
import { OtpChannel, User, UserStatus } from "@generated/client";
import { LoggingService } from "@infra/logging";
import { RbacPublicService } from "@modules/rbac";
import { UploadPublicService } from "@modules/upload";
import { UploadPurpose } from "@modules/upload/constants";

import { UserQuery } from "../constants";
import {
    AdminChangeEmailDto,
    AdminChangePhoneDto,
    AdminCreateUserDto,
    AdminUpdateUserDto,
    UserQueryDto,
} from "../dto/requests";
import { UserRepository } from "../repositories/user.repository";

@Injectable()
export class UserService {
    constructor(
        private readonly logger: LoggingService,
        private readonly emitter: EventEmitter2,
        private readonly userRepo: UserRepository,
        private readonly uploadPublic: UploadPublicService,
        private readonly rbacPublicService: RbacPublicService,
    ) {
        this.logger.setContext(UserService.name);
    }

    /**
     * List all users with optional filtering.
     */
    async list(query: UserQueryDto): Promise<PaginatedResult<User>> {
        const options = this.buildUserQuery(query);

        return this.userRepo.list(options);
    }

    /**
     * Find all users with an optional query for internal use.
     */
    async findAll(query?: QueryOptions): Promise<User[]> {
        return this.userRepo.findAll(query);
    }

    /**
     * Find a user by ID or throw 404.
     */
    async findByIdOrFail(id: string): Promise<User> {
        const user = await this.userRepo.findById(id);

        if (!user) throw AppExceptions.notFound("User", id);

        return user;
    }

    /**
     * Find a user by ID and include its counts and roles.
     */
    async findByIdWithDetails(id: string): Promise<User> {
        const user = await this.userRepo.findByIdWithDetails(id);

        if (!user) throw AppExceptions.notFound("User", id);

        return user;
    }

    /**
     * Create a new user.
     * Bypasses email and phone verification but doesn't mark them as verified.
     */
    async create(dto: AdminCreateUserDto): Promise<User> {
        const [existingUsername, existingEmail, existingPhone] = await Promise.all([
            this.userRepo.findByUsername(dto.username),
            this.userRepo.findByEmail(dto.email),
            this.userRepo.findByPhone(dto.phone),
        ]);

        if (existingUsername) throw AppExceptions.alreadyExists("User", "username");
        if (existingEmail) throw AppExceptions.alreadyExists("User", "email");
        if (existingPhone) throw AppExceptions.alreadyExists("User", "phone");

        if (dto.avatar) {
            await this.uploadPublic.validateKeyForPurpose(dto.avatar, UploadPurpose.USER_AVATAR);
        }

        const passwordHash = await PasswordUtil.hash(dto.password);

        const user = await this.userRepo.createRegisteredUser({
            username: dto.username,
            email: dto.email,
            phone: dto.phone,
            passwordHash,
            otpChannel: OtpChannel.EMAIL,
            firstName: dto.firstName,
            lastName: dto.lastName,
            displayName: dto.displayName,
            avatar: dto.avatar,
        });

        if (dto.avatar) await this.uploadPublic.attach(dto.avatar, user.id);

        this.emitter.emit(AdminUserCreatedEvent.eventName, new AdminUserCreatedEvent(user.id));

        this.logger.info("User created by admin", {
            userId: user.id,
            username: user.username,
        });

        return user;
    }

    /**
     * Update a user's basic profile information.
     */
    async update(actor: AuthenticatedUser, id: string, dto: AdminUpdateUserDto): Promise<User> {
        const user = await this.findByIdOrFail(id);

        await this.assertCanModifyUser(actor, id);

        if (dto.username && dto.username.toLowerCase() !== user.username) {
            const existing = await this.userRepo.findByUsername(dto.username);

            if (existing) throw AppExceptions.alreadyExists("User", "username");
        }

        if (dto.avatar !== undefined) {
            await this.uploadPublic.replace(user.avatar, dto.avatar, UploadPurpose.USER_AVATAR, user.id);
        }

        const updated = await this.userRepo.updateProfile(id, {
            username: dto.username,
            firstName: dto.firstName,
            lastName: dto.lastName,
            displayName: dto.displayName,
            avatar: dto.avatar,
        });

        this.emitter.emit(
            AdminUserUpdatedEvent.eventName,
            new AdminUserUpdatedEvent(id, ObjectUtil.stripUndefined(dto)),
        );

        this.logger.info("User updated by admin", {
            userId: user.id,
            changes: dto,
        });

        return updated;
    }

    /**
     * Override a user's email.
     * Clears verification status and disables 2FA if it was tied to the email channel.
     */
    async changeEmail(actor: AuthenticatedUser, id: string, dto: AdminChangeEmailDto): Promise<User> {
        const user = await this.findByIdOrFail(id);

        await this.assertCanModifyUser(actor, id);

        if (user.email === dto.newEmail.toLowerCase()) {
            throw AppExceptions.sameAsCurrentEmail();
        }

        const existing = await this.userRepo.findByEmail(dto.newEmail);

        if (existing) throw AppExceptions.alreadyExists("User", "email");

        await this.userRepo.updateEmail(id, dto.newEmail);
        await this.userRepo.clearEmailVerification(id);

        if (user.isTwoFactorOn && user.otpChannel === OtpChannel.EMAIL) {
            await this.userRepo.updateTwoFactor(id, false);
            this.logger.warn("2FA disabled for email due to admin overriding email", {
                id,
            });
        }

        this.emitter.emit(AdminEmailChangedEvent.eventName, new AdminEmailChangedEvent(id, user.email, dto.newEmail));

        this.logger.info("User email changed by admin", {
            userId: user.id,
            oldEmail: user.email,
            newEmail: dto.newEmail,
        });

        return this.findByIdOrFail(id);
    }

    /**
     * Override a user's phone.
     * Clears verification status and disables 2FA if it was tied to the phone channel.
     */
    async changePhone(actor: AuthenticatedUser, id: string, dto: AdminChangePhoneDto): Promise<User> {
        const user = await this.findByIdOrFail(id);

        await this.assertCanModifyUser(actor, id);

        if (user.phone === dto.newPhone) {
            throw AppExceptions.sameAsCurrentPhone();
        }

        const existing = await this.userRepo.findByPhone(dto.newPhone);

        if (existing) throw AppExceptions.alreadyExists("User", "phone");

        await this.userRepo.updatePhone(id, dto.newPhone);
        await this.userRepo.clearPhoneVerification(id);

        if (user.isTwoFactorOn && user.otpChannel === OtpChannel.WHATSAPP) {
            await this.userRepo.updateTwoFactor(id, false);

            this.logger.warn("2FA disabled for phone due to admin overriding phone", {
                id,
            });
        }

        this.emitter.emit(AdminPhoneChangedEvent.eventName, new AdminPhoneChangedEvent(id, user.phone, dto.newPhone));

        this.logger.info("User phone changed by admin", {
            userId: user.id,
            oldPhone: user.phone,
            newPhone: dto.newPhone,
        });

        return this.findByIdOrFail(id);
    }

    /**
     * Suspend a user and revoke all their sessions.
     */
    async suspend(actor: AuthenticatedUser, id: string): Promise<User> {
        const user = await this.findByIdOrFail(id);

        await this.assertCanModifyUser(actor, id);

        if (user.status === UserStatus.SUSPENDED) {
            throw AppExceptions.conflict("User is already suspended");
        }

        if (user.status === UserStatus.PENDING_DELETION) {
            throw AppExceptions.conflict("Cannot suspend a user pending deletion");
        }

        if (user.status === UserStatus.DELETED) {
            throw AppExceptions.conflict("Cannot suspend a deleted user");
        }

        await this.userRepo.updateStatus(id, UserStatus.SUSPENDED);

        this.emitter.emit(UserSuspendedByAdminEvent.eventName, new UserSuspendedByAdminEvent(id));

        this.logger.info("User suspended by admin", { userId: user.id });

        return this.findByIdOrFail(id);
    }

    /**
     * Unsuspend a user.
     */
    async unsuspend(actor: AuthenticatedUser, id: string): Promise<User> {
        const user = await this.findByIdOrFail(id);

        await this.assertCanModifyUser(actor, id);

        if (user.status !== UserStatus.SUSPENDED) {
            throw AppExceptions.conflict("User is not suspended");
        }

        await this.userRepo.updateStatus(id, UserStatus.ACTIVE);

        this.emitter.emit(UserUnsuspendedByAdminEvent.eventName, new UserUnsuspendedByAdminEvent(id));

        this.logger.info("User unsuspended by admin", { userId: user.id });

        return this.findByIdOrFail(id);
    }

    /**
     * Force logout a user from all devices.
     */
    async forceLogout(actor: AuthenticatedUser, id: string): Promise<void> {
        await this.findByIdOrFail(id);

        await this.assertCanModifyUser(actor, id);

        this.emitter.emit(UserForceLogoutEvent.eventName, new UserForceLogoutEvent(id));

        this.logger.info("Force logout by admin", { userId: id });
    }

    /**
     * Permanently delete a user, bypassing the grace period.
     * Soft-deletes by anonymizing the account and removing associated sessions and OTP records.
     */
    async delete(actor: AuthenticatedUser, id: string): Promise<void> {
        const user = await this.findByIdOrFail(id);

        await this.assertCanModifyUser(actor, id);

        if (user.status === UserStatus.DELETED) {
            throw AppExceptions.conflict("User is already deleted");
        }

        await this.userRepo.anonymize(id);

        this.emitter.emit(AdminUserDeletedEvent.eventName, new AdminUserDeletedEvent(id));

        this.logger.info("User deleted by admin", { userId: id });
    }

    /**
     * System user protection: blocks a non-system actor from modifying a system-role user.
     */
    private async assertCanModifyUser(actor: AuthenticatedUser, targetUserId: string): Promise<void> {
        const isSystemTarget = await this.rbacPublicService.hasSystemRole(targetUserId);

        if (isSystemTarget && !actor.hasSystemRole) {
            throw DomainExceptions.systemUserProtected();
        }
    }

    /**
     * Build query options for user listing.
     */
    private buildUserQuery(query: UserQueryDto): ListQueryOptions {
        const builder = QueryBuilderUtil.create()
            .paginate(query)
            .sort(query, UserQuery.sort)
            .search(query?.search, UserQuery.search)
            .filter("status", query?.status)
            .includeRelations(query?.include, UserQuery.include);

        if (query?.roleId) {
            builder.where({ userRoles: { some: { roleId: query.roleId } } });
        }

        if (query?.permissionKey) {
            builder.where({
                userRoles: {
                    some: {
                        role: {
                            rolePermissions: {
                                some: { permission: { key: query.permissionKey } },
                            },
                        },
                    },
                },
            });
        }

        if (query?.emailVerified !== undefined) {
            builder.where({
                emailVerifiedAt: query.emailVerified ? { not: null } : null,
            });
        }

        if (query?.phoneVerified !== undefined) {
            builder.where({
                phoneVerifiedAt: query.phoneVerified ? { not: null } : null,
            });
        }

        if (!query?.status) {
            builder.where({ status: { not: UserStatus.DELETED } });
        }

        return builder.build();
    }
}
