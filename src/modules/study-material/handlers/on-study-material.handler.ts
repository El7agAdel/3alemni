import { Injectable } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";

import { StudyMaterialDeletedEvent } from "@common/events";
import { AuditActions, AuditService } from "@shared/audit";

/**
 * Audits deleted study material.
 */
@Injectable()
export class OnStudyMaterialHandler {
    constructor(private readonly auditService: AuditService) {}

    @OnEvent(StudyMaterialDeletedEvent.eventName)
    async handleDeleted(event: StudyMaterialDeletedEvent): Promise<void> {
        await this.auditService.log({
            actorId: event.deletedBy,
            auditAction: AuditActions.STUDY_MATERIAL_DELETED,
            resourceId: event.studyMaterialId,
            details: { name: event.name, studyGroupId: event.studyGroupId },
        });
    }
}
