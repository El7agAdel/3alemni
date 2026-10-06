import { Injectable } from "@nestjs/common";

import { ListQueryOptions, PaginatedResult } from "@common/interfaces";
import { PaginationUtil } from "@common/utils";
import { Enrollment, EnrollmentStatus, JoinRequestStatus, StudyGroupJoinRequest } from "@generated/client";
import { StudyGroupJoinRequestGetPayload, StudyGroupJoinRequestInclude } from "@generated/models";
import { PrismaService } from "@infra/database";

import { USER_SUMMARY_SELECT } from "../constants";

const withRelations = {
    student: { select: USER_SUMMARY_SELECT },
    studyGroup: { select: { id: true, name: true, subject: true, status: true } },
} satisfies StudyGroupJoinRequestInclude;

export type JoinRequestWithRelations = StudyGroupJoinRequestGetPayload<{ include: typeof withRelations }>;

@Injectable()
export class JoinRequestRepository {
    constructor(private readonly prisma: PrismaService) {}

    async list(options: ListQueryOptions): Promise<PaginatedResult<JoinRequestWithRelations>> {
        const skip = (options.page - 1) * options.limit;

        const [items, total] = await Promise.all([
            this.prisma.studyGroupJoinRequest.findMany({
                where: options.where,
                orderBy: options.orderBy,
                include: withRelations,
                skip,
                take: options.limit,
            }),
            this.prisma.studyGroupJoinRequest.count({ where: options.where }),
        ]);

        return {
            items,
            meta: PaginationUtil.buildPaginationMeta(options.page, options.limit, total),
        };
    }

    async findById(id: string): Promise<JoinRequestWithRelations | null> {
        return this.prisma.studyGroupJoinRequest.findUnique({
            where: { id },
            include: withRelations,
        });
    }

    async findByGroupAndStudent(studyGroupId: string, studentId: string): Promise<StudyGroupJoinRequest | null> {
        return this.prisma.studyGroupJoinRequest.findUnique({
            where: { studyGroupId_studentId: { studyGroupId, studentId } },
        });
    }

    /**
     * Create the student's request, or re-use their old row and make it a fresh PENDING request.
     */
    async open(studyGroupId: string, studentId: string, message?: string): Promise<JoinRequestWithRelations> {
        return this.prisma.studyGroupJoinRequest.upsert({
            where: { studyGroupId_studentId: { studyGroupId, studentId } },
            create: { studyGroupId, studentId, message },
            update: {
                status: JoinRequestStatus.PENDING,
                message: message ?? null,
                decidedAt: null,
                decidedBy: null,
                decisionNote: null,
                createdAt: new Date(),
            },
            include: withRelations,
        });
    }

    /**
     * Move a PENDING request to its final status. Returns false if it was no longer PENDING,
     * so two people deciding at the same time can't both win.
     */
    async decide(
        id: string,
        status: Exclude<JoinRequestStatus, "PENDING">,
        decidedBy: string,
        decisionNote?: string,
    ): Promise<boolean> {
        const { count } = await this.prisma.studyGroupJoinRequest.updateMany({
            where: { id, status: JoinRequestStatus.PENDING },
            data: { status, decidedBy, decidedAt: new Date(), decisionNote },
        });

        return count > 0;
    }

    /**
     * Approve a PENDING request and enroll the student, in one transaction.
     * A student who was enrolled before gets their old enrollment back.
     * Returns null if the request was no longer PENDING.
     */
    async approve(
        request: Pick<StudyGroupJoinRequest, "id" | "studyGroupId" | "studentId">,
        decidedBy: string,
        decisionNote?: string,
    ): Promise<Enrollment | null> {
        return this.prisma.$transaction(async (tx) => {
            const { count } = await tx.studyGroupJoinRequest.updateMany({
                where: { id: request.id, status: JoinRequestStatus.PENDING },
                data: { status: JoinRequestStatus.APPROVED, decidedBy, decidedAt: new Date(), decisionNote },
            });

            if (count === 0) return null;

            return tx.enrollment.upsert({
                where: {
                    studyGroupId_studentId: { studyGroupId: request.studyGroupId, studentId: request.studentId },
                },
                create: {
                    studyGroupId: request.studyGroupId,
                    studentId: request.studentId,
                    status: EnrollmentStatus.ACTIVE,
                    createdBy: decidedBy,
                },
                update: {
                    status: EnrollmentStatus.ACTIVE,
                    joinedAt: new Date(),
                    leftAt: null,
                    deletedAt: null,
                    deletedBy: null,
                    updatedBy: decidedBy,
                },
            });
        });
    }
}
