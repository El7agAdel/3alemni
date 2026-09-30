import { Injectable } from "@nestjs/common";

import { ListQueryOptions, PaginatedResult } from "@common/interfaces";
import { PaginationUtil } from "@common/utils";
import { StudyGroup } from "@generated/client";
import {
    StudyGroupGetPayload,
    StudyGroupInclude,
    StudyGroupUncheckedCreateInput,
    StudyGroupUncheckedUpdateInput,
} from "@generated/models";
import { PrismaService } from "@infra/database";

import { ACTIVE_ENROLLMENT, USER_SUMMARY_SELECT } from "../constants";

/**
 * The group with its owner and student count, plus how `userId` is linked to it:
 * `assistants` and `enrollments` only hold that user's own rows (0 or 1 each).
 */
const withDetails = (userId: string) =>
    ({
        owner: { select: USER_SUMMARY_SELECT },
        assistants: { where: { userId }, select: { id: true } },
        enrollments: { where: { studentId: userId, ...ACTIVE_ENROLLMENT }, select: { id: true } },
        _count: { select: { enrollments: { where: ACTIVE_ENROLLMENT } } },
    }) satisfies StudyGroupInclude;

const withOwner = {
    owner: { select: USER_SUMMARY_SELECT },
} satisfies StudyGroupInclude;

export type StudyGroupWithDetails = StudyGroupGetPayload<{ include: ReturnType<typeof withDetails> }>;
export type StudyGroupWithOwner = StudyGroupGetPayload<{ include: typeof withOwner }>;

@Injectable()
export class StudyGroupRepository {
    constructor(private readonly prisma: PrismaService) {}

    async list(options: ListQueryOptions, userId: string): Promise<PaginatedResult<StudyGroupWithDetails>> {
        const skip = (options.page - 1) * options.limit;
        const where = { ...options.where, deletedAt: null };

        const [items, total] = await Promise.all([
            this.prisma.studyGroup.findMany({
                where,
                orderBy: options.orderBy,
                include: withDetails(userId),
                skip,
                take: options.limit,
            }),
            this.prisma.studyGroup.count({ where }),
        ]);

        return {
            items,
            meta: PaginationUtil.buildPaginationMeta(options.page, options.limit, total),
        };
    }

    async findWithDetails(id: string, userId: string): Promise<StudyGroupWithDetails | null> {
        return this.prisma.studyGroup.findFirst({
            where: { id, deletedAt: null },
            include: withDetails(userId),
        });
    }

    async findByJoinCode(joinCode: string): Promise<StudyGroupWithOwner | null> {
        return this.prisma.studyGroup.findFirst({
            where: { joinCode, deletedAt: null },
            include: withOwner,
        });
    }

    /**
     * Deleted groups count too: their codes stay unique.
     */
    async joinCodeExists(joinCode: string): Promise<boolean> {
        const count = await this.prisma.studyGroup.count({ where: { joinCode } });

        return count > 0;
    }

    async create(data: StudyGroupUncheckedCreateInput): Promise<StudyGroup> {
        return this.prisma.studyGroup.create({ data });
    }

    async update(id: string, data: StudyGroupUncheckedUpdateInput): Promise<StudyGroup> {
        return this.prisma.studyGroup.update({ where: { id }, data });
    }

    async softDelete(id: string, deletedBy: string): Promise<void> {
        await this.prisma.studyGroup.update({
            where: { id },
            data: { deletedAt: new Date(), deletedBy },
        });
    }
}
