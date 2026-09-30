import { Injectable } from "@nestjs/common";

import { StudyGroupAssistant } from "@generated/client";
import { StudyGroupAssistantGetPayload, StudyGroupAssistantInclude } from "@generated/models";
import { PrismaService } from "@infra/database";

import { USER_SUMMARY_SELECT } from "../constants";

const withUser = {
    user: { select: USER_SUMMARY_SELECT },
} satisfies StudyGroupAssistantInclude;

export type AssistantWithUser = StudyGroupAssistantGetPayload<{ include: typeof withUser }>;

@Injectable()
export class AssistantRepository {
    constructor(private readonly prisma: PrismaService) {}

    async listByGroup(studyGroupId: string): Promise<AssistantWithUser[]> {
        return this.prisma.studyGroupAssistant.findMany({
            where: { studyGroupId },
            orderBy: { createdAt: "asc" },
            include: withUser,
        });
    }

    async find(studyGroupId: string, userId: string): Promise<StudyGroupAssistant | null> {
        return this.prisma.studyGroupAssistant.findUnique({
            where: { studyGroupId_userId: { studyGroupId, userId } },
        });
    }

    async create(studyGroupId: string, userId: string, createdBy: string): Promise<AssistantWithUser> {
        return this.prisma.studyGroupAssistant.create({
            data: { studyGroupId, userId, createdBy },
            include: withUser,
        });
    }

    async delete(id: string): Promise<void> {
        await this.prisma.studyGroupAssistant.delete({ where: { id } });
    }
}
