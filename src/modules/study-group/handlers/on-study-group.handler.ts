import { Injectable } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";

import {
    EnrollmentEndedEvent,
    JoinRequestApprovedEvent,
    StudyGroupAssistantAddedEvent,
    StudyGroupAssistantRemovedEvent,
    StudyGroupDeletedEvent,
} from "@common/events";
import { AuditActions, AuditService } from "@shared/audit";

/**
 * Audits who gained or lost access to a study group, and deleted groups.
 */
@Injectable()
export class OnStudyGroupHandler {
    constructor(private readonly auditService: AuditService) {}

    @OnEvent(StudyGroupDeletedEvent.eventName)
    async handleDeleted(event: StudyGroupDeletedEvent): Promise<void> {
        await this.auditService.log({
            actorId: event.deletedBy,
            auditAction: AuditActions.STUDY_GROUP_DELETED,
            resourceId: event.studyGroupId,
            details: { name: event.name },
        });
    }

    @OnEvent(JoinRequestApprovedEvent.eventName)
    async handleJoinRequestApproved(event: JoinRequestApprovedEvent): Promise<void> {
        await this.auditService.log({
            actorId: event.approvedBy,
            auditAction: AuditActions.STUDY_GROUP_STUDENT_APPROVED,
            resourceId: event.studyGroupId,
            details: { studentId: event.studentId, requestId: event.requestId, enrollmentId: event.enrollmentId },
        });
    }

    @OnEvent(EnrollmentEndedEvent.eventName)
    async handleEnrollmentEnded(event: EnrollmentEndedEvent): Promise<void> {
        await this.auditService.log({
            actorId: event.endedBy,
            auditAction: AuditActions.STUDY_GROUP_STUDENT_REMOVED,
            resourceId: event.studyGroupId,
            details: { studentId: event.studentId, enrollmentId: event.enrollmentId, reason: event.reason },
        });
    }

    @OnEvent(StudyGroupAssistantAddedEvent.eventName)
    async handleAssistantAdded(event: StudyGroupAssistantAddedEvent): Promise<void> {
        await this.auditService.log({
            actorId: event.addedBy,
            auditAction: AuditActions.STUDY_GROUP_ASSISTANT_ADDED,
            resourceId: event.studyGroupId,
            details: { userId: event.userId },
        });
    }

    @OnEvent(StudyGroupAssistantRemovedEvent.eventName)
    async handleAssistantRemoved(event: StudyGroupAssistantRemovedEvent): Promise<void> {
        await this.auditService.log({
            actorId: event.removedBy,
            auditAction: AuditActions.STUDY_GROUP_ASSISTANT_REMOVED,
            resourceId: event.studyGroupId,
            details: { userId: event.userId },
        });
    }
}
