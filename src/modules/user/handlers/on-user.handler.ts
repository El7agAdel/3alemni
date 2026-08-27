import { Injectable } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";

import {
    AdminEmailChangedEvent,
    AdminPhoneChangedEvent,
    AdminUserCreatedEvent,
    AdminUserDeletedEvent,
    AdminUserUpdatedEvent,
    UserDeletionRequestedEvent,
    UserForceLogoutEvent,
    UserSuspendedByAdminEvent,
    UserUnsuspendedByAdminEvent,
} from "@common/events";
import { DateUtil } from "@common/utils";
import { ConfigService } from "@config";
import { AuditActions, AuditService } from "@shared/audit";
import { AccountDeletionEmail, EmailService } from "@shared/messaging";

import { UserPublicService } from "../services";

@Injectable()
export class OnUserHandler {
    constructor(
        private readonly config: ConfigService,
        private readonly auditService: AuditService,
        private readonly emailService: EmailService,
        private readonly userPublicService: UserPublicService,
    ) {}

    @OnEvent(AdminUserCreatedEvent.eventName)
    async handleCreated(event: AdminUserCreatedEvent): Promise<void> {
        await this.auditService.log({
            auditAction: AuditActions.ADMIN_USER_CREATED,
            resourceId: event.userId,
        });
    }

    @OnEvent(AdminUserUpdatedEvent.eventName)
    async handleUpdated(event: AdminUserUpdatedEvent): Promise<void> {
        await this.auditService.log({
            auditAction: AuditActions.ADMIN_USER_UPDATED,
            resourceId: event.userId,
            details: { changes: event.changes },
        });
    }

    @OnEvent(AdminEmailChangedEvent.eventName)
    async handleEmailChanged(event: AdminEmailChangedEvent): Promise<void> {
        await this.auditService.log({
            auditAction: AuditActions.ADMIN_EMAIL_CHANGED,
            resourceId: event.userId,
            details: { oldEmail: event.oldEmail, newEmail: event.newEmail },
        });
    }

    @OnEvent(AdminPhoneChangedEvent.eventName)
    async handlePhoneChanged(event: AdminPhoneChangedEvent): Promise<void> {
        await this.auditService.log({
            auditAction: AuditActions.ADMIN_PHONE_CHANGED,
            resourceId: event.userId,
            details: { oldPhone: event.oldPhone, newPhone: event.newPhone },
        });
    }

    @OnEvent(UserSuspendedByAdminEvent.eventName)
    async handleSuspended(event: UserSuspendedByAdminEvent): Promise<void> {
        await this.auditService.log({
            auditAction: AuditActions.ADMIN_USER_SUSPENDED,
            resourceId: event.userId,
        });
    }

    @OnEvent(UserUnsuspendedByAdminEvent.eventName)
    async handleUnsuspended(event: UserUnsuspendedByAdminEvent): Promise<void> {
        await this.auditService.log({
            auditAction: AuditActions.ADMIN_USER_UNSUSPENDED,
            resourceId: event.userId,
        });
    }

    @OnEvent(UserForceLogoutEvent.eventName)
    async handleForceLogout(event: UserForceLogoutEvent): Promise<void> {
        await this.auditService.log({
            auditAction: AuditActions.ADMIN_FORCE_LOGOUT,
            resourceId: event.userId,
        });
    }

    @OnEvent(AdminUserDeletedEvent.eventName)
    async handleDeleted(event: AdminUserDeletedEvent): Promise<void> {
        await this.auditService.log({
            auditAction: AuditActions.ADMIN_USER_DELETED,
            resourceId: event.userId,
        });
    }

    @OnEvent(UserDeletionRequestedEvent.eventName)
    async handleDeletionRequested(event: UserDeletionRequestedEvent): Promise<void> {
        await this.auditService.log({
            auditAction: AuditActions.SELF_DELETION_REQUESTED,
            resourceId: event.userId,
            details: { scheduledDeletionAt: event.scheduledDeletionAt.toISOString() },
        });

        const user = await this.userPublicService.findById(event.userId);

        if (!user) return;

        const scheduledDate = DateUtil.formatDisplay(event.scheduledDeletionAt);

        await this.emailService.queue(
            user.email,
            new AccountDeletionEmail({
                recipientName: user.firstName ?? user.username,
                scheduledDate,
                gracePeriodDays: this.config.auth.accountDeletion.gracePeriodDays,
            }),
        );
    }
}
