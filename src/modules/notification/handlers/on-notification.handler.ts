import { Injectable } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";

import { BroadcastSentEvent } from "@common/events";
import { AuditActions, AuditService } from "@shared/audit";

@Injectable()
export class OnNotificationHandler {
    constructor(private readonly auditService: AuditService) {}

    @OnEvent(BroadcastSentEvent.eventName)
    async handleBroadcastSent(event: BroadcastSentEvent): Promise<void> {
        await this.auditService.log({
            actorId: event.createdBy,
            auditAction: AuditActions.BROADCAST_SENT,
            resourceId: event.broadcastId,
            details: {
                audience: event.audience,
                audienceSize: event.audienceSize,
                channel: event.channel,
                persistAsNotification: event.persistAsNotification,
            },
        });
    }
}
