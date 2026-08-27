import { Injectable } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";

import {
    AdminUserDeletedEvent,
    PasswordChangedEvent,
    UserDeletionRequestedEvent,
    UserForceLogoutEvent,
    UserSuspendedByAdminEvent,
} from "@common/events";

import { SessionService } from "../services";

/**
 * Handles all events emitted by the User module that require session revocation.
 */
@Injectable()
export class OnUserHandler {
    constructor(private readonly sessionService: SessionService) {}

    @OnEvent(PasswordChangedEvent.eventName)
    async handlePasswordChanged(event: PasswordChangedEvent): Promise<void> {
        await this.sessionService.revokeAll(event.userId);
    }

    @OnEvent(UserDeletionRequestedEvent.eventName)
    async handleDeletionRequested(event: UserDeletionRequestedEvent): Promise<void> {
        await this.sessionService.revokeAll(event.userId);
    }

    @OnEvent(UserSuspendedByAdminEvent.eventName)
    async handleSuspended(event: UserSuspendedByAdminEvent): Promise<void> {
        await this.sessionService.revokeAll(event.userId);
    }

    @OnEvent(UserForceLogoutEvent.eventName)
    async handleForceLogout(event: UserForceLogoutEvent): Promise<void> {
        await this.sessionService.revokeAll(event.userId);
    }

    @OnEvent(AdminUserDeletedEvent.eventName)
    async handleDeleted(event: AdminUserDeletedEvent): Promise<void> {
        await this.sessionService.revokeAll(event.userId);
    }
}
