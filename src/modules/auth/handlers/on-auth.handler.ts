import { Injectable } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";

import {
    AccountRestoredEvent,
    PasswordResetCompletedEvent,
    SuspiciousLoginActivityEvent,
    TwoFactorDisabledEvent,
    TwoFactorEnabledEvent,
} from "@common/events";
import { AuditActions, AuditService } from "@shared/audit";

/**
 * Audits security-relevant authentication events.
 */
@Injectable()
export class OnAuthHandler {
    constructor(private readonly auditService: AuditService) {}

    @OnEvent(PasswordResetCompletedEvent.eventName)
    async handlePasswordReset(event: PasswordResetCompletedEvent): Promise<void> {
        await this.auditService.log({
            actorId: event.userId,
            auditAction: AuditActions.PASSWORD_RESET_COMPLETED,
            resourceId: event.userId,
            details: { revokedSessionCount: event.revokedSessionCount },
        });
    }

    @OnEvent(TwoFactorEnabledEvent.eventName)
    async handleTwoFactorEnabled(event: TwoFactorEnabledEvent): Promise<void> {
        await this.auditService.log({
            actorId: event.userId,
            auditAction: AuditActions.TWO_FACTOR_ENABLED,
            resourceId: event.userId,
            details: { channel: event.channel },
        });
    }

    @OnEvent(TwoFactorDisabledEvent.eventName)
    async handleTwoFactorDisabled(event: TwoFactorDisabledEvent): Promise<void> {
        await this.auditService.log({
            actorId: event.userId,
            auditAction: AuditActions.TWO_FACTOR_DISABLED,
            resourceId: event.userId,
        });
    }

    @OnEvent(SuspiciousLoginActivityEvent.eventName)
    async handleSuspiciousLogin(event: SuspiciousLoginActivityEvent): Promise<void> {
        await this.auditService.log({
            auditAction: AuditActions.LOGIN_LOCKED,
            details: {
                identifier: event.identifier,
                ipAddress: event.ipAddress,
                failedAttempts: event.failedAttempts,
            },
        });
    }

    @OnEvent(AccountRestoredEvent.eventName)
    async handleAccountRestored(event: AccountRestoredEvent): Promise<void> {
        await this.auditService.log({
            actorId: event.userId,
            auditAction: AuditActions.ACCOUNT_RESTORED,
            resourceId: event.userId,
        });
    }
}
