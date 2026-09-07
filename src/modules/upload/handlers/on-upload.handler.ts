import { Injectable } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";

import { UploadDeletedEvent } from "@common/events";
import { AuditActions, AuditService } from "@shared/audit";

/**
 * The audit trail for files removed by hand.
 */
@Injectable()
export class OnUploadHandler {
    constructor(private readonly auditService: AuditService) {}

    @OnEvent(UploadDeletedEvent.eventName)
    async handleDeleted(event: UploadDeletedEvent): Promise<void> {
        await this.auditService.log({
            actorId: event.deletedBy,
            auditAction: AuditActions.UPLOAD_DELETED,
            resourceId: event.uploadId,
            details: { key: event.key, purpose: event.purpose },
        });
    }
}
