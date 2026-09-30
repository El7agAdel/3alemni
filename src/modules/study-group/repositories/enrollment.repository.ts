import { Injectable } from "@nestjs/common";

import { ListQueryOptions, PaginatedResult } from "@common/interfaces";
import { PaginationUtil } from "@common/utils";
import { Enrollment, EnrollmentStatus } from "@generated/client";
import { EnrollmentGetPayload, EnrollmentInclude } from "@generated/models";
import { PrismaService } from "@infra/database";

import { ACTIVE_ENROLLMENT, USER_SUMMARY_SELECT } from "../constants";

const withStudent = {
    student: { select: USER_SUMMARY_SELECT },
} satisfies EnrollmentInclude;

export type EnrollmentWithStudent = EnrollmentGetPayload<{ include: typeof withStudent }>;

@Injectable()
export class EnrollmentRepository {
    constructor(private readonly prisma: PrismaService) {}

    async list(options: ListQueryOptions): Promise<PaginatedResult<EnrollmentWithStudent>> {
        const skip = (options.page - 1) * options.limit;
        const where = { ...options.where, deletedAt: null };

        const [items, total] = await Promise.all([
            this.prisma.enrollment.findMany({
                where,
                orderBy: options.orderBy,
                include: withStudent,
                skip,
                take: options.limit,
            }),
            this.prisma.enrollment.count({ where }),
        ]);

        return {
            items,
            meta: PaginationUtil.buildPaginationMeta(options.page, options.limit, total),
        };
    }

    /**
     * The student's ACTIVE enrollment in a group that is not deleted.
     */
    async findActive(studyGroupId: string, studentId: string): Promise<Enrollment | null> {
        return this.prisma.enrollment.findFirst({
            where: {
                studyGroupId,
                studentId,
                ...ACTIVE_ENROLLMENT,
                studyGroup: { deletedAt: null },
            },
        });
    }

    async withdraw(id: string, updatedBy: string): Promise<void> {
        await this.prisma.enrollment.update({
            where: { id },
            data: { status: EnrollmentStatus.WITHDRAWN, leftAt: new Date(), updatedBy },
        });
    }
}
