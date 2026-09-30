import { Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";

import { JoinRequestApprovedEvent } from "@common/events";
import { AppExceptions, DomainExceptions } from "@common/exceptions";
import { AuthenticatedUser, PaginatedResult } from "@common/interfaces";
import { QueryBuilderUtil } from "@common/utils";
import { JoinRequestStatus, StudyGroupStatus } from "@generated/client";
import { LoggingService } from "@infra/logging";

import { GroupRole, JoinRequestQuery } from "../constants";
import { DecideRequestDto, JoinRequestQueryDto, JoinStudyGroupDto } from "../dto/requests";
import {
    AssistantRepository,
    JoinRequestRepository,
    JoinRequestWithRelations,
    StudyGroupRepository,
    StudyGroupWithOwner,
} from "../repositories";

import { StudyGroupPublicService } from "./study-group-public.service";

@Injectable()
export class JoinRequestService {
    constructor(
        private readonly logger: LoggingService,
        private readonly emitter: EventEmitter2,
        private readonly studyGroupRepo: StudyGroupRepository,
        private readonly joinRequestRepo: JoinRequestRepository,
        private readonly assistantRepo: AssistantRepository,
        private readonly studyGroupPublic: StudyGroupPublicService,
    ) {
        this.logger.setContext(JoinRequestService.name);
    }

    /**
     * The group behind a join code, so the student can see it before asking.
     */
    async preview(code: string): Promise<StudyGroupWithOwner> {
        const group = await this.studyGroupRepo.findByJoinCode(code.trim().toUpperCase());

        if (!group) throw AppExceptions.notFound("Study group");

        return group;
    }

    /**
     * Ask to join the group behind a join code.
     * Asking again after a rejected, cancelled, or ended membership re-uses the student's old request.
     */
    async ask(actor: AuthenticatedUser, dto: JoinStudyGroupDto): Promise<JoinRequestWithRelations> {
        const group = await this.preview(dto.code);

        if (group.status !== StudyGroupStatus.ACTIVE) throw DomainExceptions.studyGroupNotJoinable(group.status);

        await this.studyGroupPublic.assertNotMember(group, actor.id);

        const existing = await this.joinRequestRepo.findByGroupAndStudent(group.id, actor.id);

        if (existing?.status === JoinRequestStatus.PENDING) {
            throw DomainExceptions.requestAlreadyExists(existing.status);
        }

        const request = await this.joinRequestRepo.open(group.id, actor.id, dto.message);

        this.logger.info("Join request sent", { requestId: request.id, studyGroupId: group.id, studentId: actor.id });

        return request;
    }

    /**
     * The actor's own join requests, skipping deleted groups.
     */
    async listMine(
        actor: AuthenticatedUser,
        query: JoinRequestQueryDto,
    ): Promise<PaginatedResult<JoinRequestWithRelations>> {
        const options = QueryBuilderUtil.create()
            .paginate(query)
            .sort(query, JoinRequestQuery.sort)
            .filter("status", query.status)
            .where({ studentId: actor.id, studyGroup: { deletedAt: null } })
            .build();

        return this.joinRequestRepo.list(options);
    }

    /**
     * Cancel one of the actor's own PENDING requests.
     */
    async cancel(actor: AuthenticatedUser, id: string): Promise<JoinRequestWithRelations> {
        const request = await this.joinRequestRepo.findById(id);

        if (!request || request.studentId !== actor.id) throw AppExceptions.notFound("Join request", id);

        await this.decide(request, JoinRequestStatus.CANCELLED, actor.id);

        this.logger.info("Join request cancelled", { requestId: id });

        return this.findByIdOrFail(id);
    }

    /**
     * The group's join requests, PENDING ones unless a status is asked for. Owner only.
     */
    async listForGroup(
        actor: AuthenticatedUser,
        groupId: string,
        query: JoinRequestQueryDto,
    ): Promise<PaginatedResult<JoinRequestWithRelations>> {
        await this.studyGroupPublic.assertOwner(actor, groupId);

        const options = QueryBuilderUtil.create()
            .paginate(query)
            .sort(query, JoinRequestQuery.sort)
            .filter("status", query.status ?? JoinRequestStatus.PENDING)
            .where({ studyGroupId: groupId })
            .build();

        return this.joinRequestRepo.list(options);
    }

    /**
     * Approve a PENDING request: the student gets an ACTIVE enrollment. Owner only, ACTIVE groups only.
     */
    async approve(
        actor: AuthenticatedUser,
        groupId: string,
        requestId: string,
        dto: DecideRequestDto,
    ): Promise<JoinRequestWithRelations> {
        const group = await this.studyGroupPublic.assertOwner(actor, groupId);
        const request = await this.findInGroup(groupId, requestId);

        if (request.status !== JoinRequestStatus.PENDING) {
            throw DomainExceptions.requestWrongStatus("approved", request.status);
        }

        if (group.status !== StudyGroupStatus.ACTIVE) throw DomainExceptions.studyGroupNotJoinable(group.status);

        // The student may have been added as an assistant after asking
        const assistant = await this.assistantRepo.find(groupId, request.studentId);

        if (assistant) throw DomainExceptions.studyGroupAlreadyMember(GroupRole.ASSISTANT);

        const enrollment = await this.joinRequestRepo.approve(request, actor.id, dto.note);

        if (!enrollment) return this.throwNoLongerPending(requestId, "approved");

        this.emitter.emit(
            JoinRequestApprovedEvent.eventName,
            new JoinRequestApprovedEvent(groupId, requestId, request.studentId, enrollment.id, actor.id),
        );

        this.logger.info("Join request approved", { requestId, studyGroupId: groupId, studentId: request.studentId });

        return this.findByIdOrFail(requestId);
    }

    /**
     * Reject a PENDING request. Owner only.
     */
    async reject(
        actor: AuthenticatedUser,
        groupId: string,
        requestId: string,
        dto: DecideRequestDto,
    ): Promise<JoinRequestWithRelations> {
        await this.studyGroupPublic.assertOwner(actor, groupId);
        const request = await this.findInGroup(groupId, requestId);

        await this.decide(request, JoinRequestStatus.REJECTED, actor.id, dto.note);

        this.logger.info("Join request rejected", { requestId, studyGroupId: groupId });

        return this.findByIdOrFail(requestId);
    }

    /**
     * Close a PENDING request as REJECTED or CANCELLED.
     */
    private async decide(
        request: JoinRequestWithRelations,
        status: typeof JoinRequestStatus.REJECTED | typeof JoinRequestStatus.CANCELLED,
        actorId: string,
        note?: string,
    ): Promise<void> {
        const action = status === JoinRequestStatus.REJECTED ? "rejected" : "cancelled";

        if (request.status !== JoinRequestStatus.PENDING) {
            throw DomainExceptions.requestWrongStatus(action, request.status);
        }

        const decided = await this.joinRequestRepo.decide(request.id, status, actorId, note);

        if (!decided) await this.throwNoLongerPending(request.id, action);
    }

    /**
     * Someone else decided the request between our read and our write: report its new status.
     */
    private async throwNoLongerPending(requestId: string, action: string): Promise<never> {
        const current = await this.findByIdOrFail(requestId);

        throw DomainExceptions.requestWrongStatus(action, current.status);
    }

    private async findInGroup(groupId: string, requestId: string): Promise<JoinRequestWithRelations> {
        const request = await this.joinRequestRepo.findById(requestId);

        if (!request || request.studyGroupId !== groupId) throw AppExceptions.notFound("Join request", requestId);

        return request;
    }

    private async findByIdOrFail(id: string): Promise<JoinRequestWithRelations> {
        const request = await this.joinRequestRepo.findById(id);

        if (!request) throw AppExceptions.notFound("Join request", id);

        return request;
    }
}
