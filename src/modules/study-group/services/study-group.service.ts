import { Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";

import { StudyGroupDeletedEvent } from "@common/events";
import { AppExceptions, DomainExceptions } from "@common/exceptions";
import { AuthenticatedUser, PaginatedResult } from "@common/interfaces";
import { GenerateUtil, QueryBuilderUtil } from "@common/utils";
import { LoggingService } from "@infra/logging";

import { ACTIVE_ENROLLMENT, GroupRole, JOIN_CODE_LENGTH, JOIN_CODE_MAX_ATTEMPTS, StudyGroupQuery } from "../constants";
import { AllStudyGroupsQueryDto, CreateStudyGroupDto, StudyGroupQueryDto, UpdateStudyGroupDto } from "../dto/requests";
import { StudyGroupRepository, StudyGroupWithDetails } from "../repositories";

import { StudyGroupPublicService } from "./study-group-public.service";

export type StudyGroupView = StudyGroupWithDetails & { myRole: GroupRole | null };

@Injectable()
export class StudyGroupService {
    constructor(
        private readonly logger: LoggingService,
        private readonly emitter: EventEmitter2,
        private readonly studyGroupRepo: StudyGroupRepository,
        private readonly studyGroupPublic: StudyGroupPublicService,
    ) {
        this.logger.setContext(StudyGroupService.name);
    }

    /**
     * List the groups the actor is linked to, as owner, assistant, or ACTIVE student.
     * The "groups I am linked to" filter goes inside AND, because search() writes to where.OR.
     */
    async list(actor: AuthenticatedUser, query: StudyGroupQueryDto): Promise<PaginatedResult<StudyGroupView>> {
        const links: Record<GroupRole, Record<string, unknown>> = {
            [GroupRole.OWNER]: { ownerId: actor.id },
            [GroupRole.ASSISTANT]: { assistants: { some: { userId: actor.id } } },
            [GroupRole.STUDENT]: { enrollments: { some: { studentId: actor.id, ...ACTIVE_ENROLLMENT } } },
        };

        const options = this.baseQuery(query)
            .where({ AND: [query.role ? links[query.role] : { OR: Object.values(links) }] })
            .build();

        return this.withRoles(actor, await this.studyGroupRepo.list(options, actor.id));
    }

    /**
     * Every study group in the app, for the platform admins who oversee it.
     * `myRole` is null on groups an Admin is not linked to (System counts as OWNER everywhere).
     */
    async listAll(actor: AuthenticatedUser, query: AllStudyGroupsQueryDto): Promise<PaginatedResult<StudyGroupView>> {
        const options = this.baseQuery(query).filter("ownerId", query.ownerId).build();

        return this.withRoles(actor, await this.studyGroupRepo.list(options, actor.id));
    }

    /**
     * A group the actor is linked to, with the actor's role in it.
     */
    async findOne(actor: AuthenticatedUser, id: string): Promise<StudyGroupView> {
        const { group, role } = await this.studyGroupPublic.getAccess(actor, id);

        return { ...group, myRole: role };
    }

    /**
     * Create a group owned by the actor, with a fresh join code.
     */
    async create(actor: AuthenticatedUser, dto: CreateStudyGroupDto): Promise<StudyGroupView> {
        this.assertDateRange(dto.startsOn, dto.endsOn);

        const joinCode = await this.generateJoinCode();

        const group = await this.studyGroupRepo.create({
            ...this.toData(dto),
            name: dto.name,
            rate: dto.rate,
            daysOfWeek: dto.daysOfWeek ?? [],
            ownerId: actor.id,
            joinCode,
            createdBy: actor.id,
        });

        this.logger.info("Study group created", { studyGroupId: group.id, ownerId: actor.id });

        return this.findOne(actor, group.id);
    }

    /**
     * Update a group's details, schedule, billing terms, or status. Owner only.
     */
    async update(actor: AuthenticatedUser, id: string, dto: UpdateStudyGroupDto): Promise<StudyGroupView> {
        const group = await this.studyGroupPublic.assertOwner(actor, id);

        this.assertDateRange(
            dto.startsOn !== undefined ? dto.startsOn : group.startsOn,
            dto.endsOn !== undefined ? dto.endsOn : group.endsOn,
        );

        await this.studyGroupRepo.update(id, {
            ...this.toData(dto),
            name: dto.name,
            rate: dto.rate,
            status: dto.status,
            updatedBy: actor.id,
        });

        this.logger.info("Study group updated", { studyGroupId: id, changes: dto });

        return this.findOne(actor, id);
    }

    /**
     * Soft-delete a group. Owner only, and only once it has no ACTIVE students.
     */
    async delete(actor: AuthenticatedUser, id: string): Promise<void> {
        const group = await this.studyGroupPublic.assertOwner(actor, id);

        const activeStudents = group._count.enrollments;

        if (activeStudents > 0) {
            throw DomainExceptions.resourceInUse(
                "study group",
                group.name,
                "enrollment",
                activeStudents,
                "it still has active students. Archive it instead.",
            );
        }

        await this.studyGroupRepo.softDelete(id, actor.id);

        this.emitter.emit(StudyGroupDeletedEvent.eventName, new StudyGroupDeletedEvent(id, group.name, actor.id));

        this.logger.info("Study group deleted", { studyGroupId: id });
    }

    /**
     * The code students use to ask to join. Owner only.
     */
    async getJoinCode(actor: AuthenticatedUser, id: string): Promise<{ joinCode: string }> {
        const group = await this.studyGroupPublic.assertOwner(actor, id);

        return { joinCode: group.joinCode };
    }

    /**
     * Replace the join code. The old code stops working; open requests are kept. Owner only.
     */
    async resetJoinCode(actor: AuthenticatedUser, id: string): Promise<{ joinCode: string }> {
        await this.studyGroupPublic.assertOwner(actor, id);

        const joinCode = await this.generateJoinCode();

        await this.studyGroupRepo.update(id, { joinCode, updatedBy: actor.id });

        this.logger.info("Study group join code reset", { studyGroupId: id });

        return { joinCode };
    }

    /**
     * The fields create and update share. Date-only strings become Dates; null clears a field.
     */
    private toData(dto: Partial<CreateStudyGroupDto>) {
        return {
            subject: dto.subject,
            description: dto.description,
            recurrence: dto.recurrence,
            recurrenceInterval: dto.recurrenceInterval,
            daysOfWeek: dto.daysOfWeek,
            startTime: dto.startTime,
            durationMinutes: dto.durationMinutes,
            timezone: dto.timezone,
            startsOn: this.toDate(dto.startsOn),
            endsOn: this.toDate(dto.endsOn),
            paymentSchedule: dto.paymentSchedule,
            paymentMethod: dto.paymentMethod,
            currency: dto.currency,
        };
    }

    private toDate(value: string | null | undefined): Date | null | undefined {
        if (value === undefined || value === null) return value;

        return new Date(value);
    }

    private assertDateRange(startsOn?: Date | string | null, endsOn?: Date | string | null): void {
        if (!startsOn || !endsOn) return;

        if (new Date(endsOn) < new Date(startsOn)) {
            throw AppExceptions.validationFailed({ endsOn: ["endsOn must not be before startsOn"] });
        }
    }

    private async generateJoinCode(): Promise<string> {
        for (let attempt = 0; attempt < JOIN_CODE_MAX_ATTEMPTS; attempt++) {
            const code = GenerateUtil.shortCode(JOIN_CODE_LENGTH);

            if (!(await this.studyGroupRepo.joinCodeExists(code))) return code;
        }

        throw AppExceptions.internal("Could not generate a unique join code");
    }

    /**
     * Paging, sorting, search and status filter, shared by both group lists.
     */
    private baseQuery(query: StudyGroupQueryDto | AllStudyGroupsQueryDto): QueryBuilderUtil {
        return QueryBuilderUtil.create()
            .paginate(query)
            .sort(query, StudyGroupQuery.sort)
            .search(query.search, StudyGroupQuery.search)
            .filter("status", query.status);
    }

    private withRoles(
        actor: AuthenticatedUser,
        result: PaginatedResult<StudyGroupWithDetails>,
    ): PaginatedResult<StudyGroupView> {
        return {
            items: result.items.map((group) => ({ ...group, myRole: this.studyGroupPublic.resolveRole(actor, group) })),
            meta: result.meta,
        };
    }
}
