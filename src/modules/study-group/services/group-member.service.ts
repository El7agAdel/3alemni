import { Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";

import { EnrollmentEndedEvent, StudyGroupAssistantAddedEvent, StudyGroupAssistantRemovedEvent } from "@common/events";
import { AppExceptions, DomainExceptions } from "@common/exceptions";
import { AuthenticatedUser, PaginatedResult } from "@common/interfaces";
import { QueryBuilderUtil } from "@common/utils";
import { EnrollmentStatus, UserStatus } from "@generated/client";
import { LoggingService } from "@infra/logging";
import { Permissions, RbacPublicService } from "@modules/rbac";
import { UserPublicService } from "@modules/user";

import { GroupStudentQuery } from "../constants";
import { AddAssistantDto, GroupStudentQueryDto } from "../dto/requests";
import { AssistantRepository, AssistantWithUser, EnrollmentRepository, EnrollmentWithStudent } from "../repositories";

import { StudyGroupPublicService } from "./study-group-public.service";

@Injectable()
export class GroupMemberService {
    constructor(
        private readonly logger: LoggingService,
        private readonly emitter: EventEmitter2,
        private readonly assistantRepo: AssistantRepository,
        private readonly enrollmentRepo: EnrollmentRepository,
        private readonly studyGroupPublic: StudyGroupPublicService,
        private readonly userPublic: UserPublicService,
        private readonly rbacPublic: RbacPublicService,
    ) {
        this.logger.setContext(GroupMemberService.name);
    }

    /**
     * The group's teaching assistants. Staff only.
     */
    async listAssistants(actor: AuthenticatedUser, groupId: string): Promise<AssistantWithUser[]> {
        await this.studyGroupPublic.assertStaff(actor, groupId);

        return this.assistantRepo.listByGroup(groupId);
    }

    /**
     * Add a teaching assistant, found by username, email, or phone. Owner only.
     * The user must be allowed to assist (study-group:assist, given by the Teaching Assistant role).
     */
    async addAssistant(actor: AuthenticatedUser, groupId: string, dto: AddAssistantDto): Promise<AssistantWithUser> {
        const group = await this.studyGroupPublic.assertOwner(actor, groupId);

        const user = await this.userPublic.findByIdentifier(dto.identifier);

        if (!user || user.status !== UserStatus.ACTIVE) throw AppExceptions.notFound("User", dto.identifier);

        const permissions = await this.rbacPublic.getUserPermissions(user.id);

        if (!permissions.includes(Permissions.StudyGroup.ASSIST.key)) throw DomainExceptions.studyGroupNotAssistant();

        await this.studyGroupPublic.assertNotMember(group, user.id);

        const assistant = await this.assistantRepo.create(groupId, user.id, actor.id);

        this.emitter.emit(
            StudyGroupAssistantAddedEvent.eventName,
            new StudyGroupAssistantAddedEvent(groupId, user.id, actor.id),
        );

        this.logger.info("Assistant added to study group", { studyGroupId: groupId, userId: user.id });

        return assistant;
    }

    /**
     * Remove a teaching assistant. Owner only.
     */
    async removeAssistant(actor: AuthenticatedUser, groupId: string, userId: string): Promise<void> {
        await this.studyGroupPublic.assertOwner(actor, groupId);

        const assistant = await this.assistantRepo.find(groupId, userId);

        if (!assistant) throw AppExceptions.notFound("Assistant", userId);

        await this.assistantRepo.delete(assistant.id);

        this.emitter.emit(
            StudyGroupAssistantRemovedEvent.eventName,
            new StudyGroupAssistantRemovedEvent(groupId, userId, actor.id),
        );

        this.logger.info("Assistant removed from study group", { studyGroupId: groupId, userId });
    }

    /**
     * The group's students, ACTIVE ones unless a status is asked for. Staff only.
     */
    async listStudents(
        actor: AuthenticatedUser,
        groupId: string,
        query: GroupStudentQueryDto,
    ): Promise<PaginatedResult<EnrollmentWithStudent>> {
        await this.studyGroupPublic.assertStaff(actor, groupId);

        const builder = QueryBuilderUtil.create()
            .paginate(query)
            .sort(query, GroupStudentQuery.sort)
            .filter("status", query.status ?? EnrollmentStatus.ACTIVE)
            .where({ studyGroupId: groupId });

        if (query.search) {
            builder.where({
                student: {
                    OR: GroupStudentQuery.search.map((field) => ({
                        [field]: { contains: query.search, mode: "insensitive" },
                    })),
                },
            });
        }

        return this.enrollmentRepo.list(builder.build());
    }

    /**
     * Take a student out of the group. Owner only.
     */
    async removeStudent(actor: AuthenticatedUser, groupId: string, studentId: string): Promise<void> {
        await this.studyGroupPublic.assertOwner(actor, groupId);

        const enrollment = await this.enrollmentRepo.findActive(groupId, studentId);

        if (!enrollment) throw AppExceptions.notFound("Student", studentId);

        await this.endEnrollment(enrollment.id, groupId, studentId, "REMOVED", actor.id);
    }

    /**
     * The actor leaves a group they are a student of.
     */
    async leave(actor: AuthenticatedUser, groupId: string): Promise<void> {
        const enrollment = await this.enrollmentRepo.findActive(groupId, actor.id);

        if (!enrollment) {
            // 404 when not linked at all, 403 for the owner or an assistant
            await this.studyGroupPublic.getAccess(actor, groupId);

            throw AppExceptions.resourceForbidden("study group", "Only students can leave a study group");
        }

        await this.endEnrollment(enrollment.id, groupId, actor.id, "LEFT", actor.id);
    }

    private async endEnrollment(
        enrollmentId: string,
        groupId: string,
        studentId: string,
        reason: EnrollmentEndedEvent["reason"],
        actorId: string,
    ): Promise<void> {
        await this.enrollmentRepo.withdraw(enrollmentId, actorId);

        this.emitter.emit(
            EnrollmentEndedEvent.eventName,
            new EnrollmentEndedEvent(groupId, enrollmentId, studentId, reason, actorId),
        );

        this.logger.info("Student left study group", { studyGroupId: groupId, studentId, reason });
    }
}
