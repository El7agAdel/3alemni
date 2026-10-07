import { Injectable } from "@nestjs/common";

import { ListQueryOptions, PaginatedResult } from "@common/interfaces";
import { PaginationUtil } from "@common/utils";
import { StudyMaterial } from "@generated/client";
import { StudyMaterialUncheckedCreateInput, StudyMaterialUncheckedUpdateInput } from "@generated/models";
import { PrismaService } from "@infra/database";

@Injectable()
export class StudyMaterialRepository {
    constructor(private readonly prisma: PrismaService) {}

    async list(options: ListQueryOptions): Promise<PaginatedResult<StudyMaterial>> {
        const skip = (options.page - 1) * options.limit;
        const where = { ...options.where, deletedAt: null };

        const [items, total] = await Promise.all([
            this.prisma.studyMaterial.findMany({
                where,
                // id breaks ties (e.g. same position), so pages stay stable
                orderBy: [...[options.orderBy ?? []].flat(), { id: "asc" }],
                skip,
                take: options.limit,
            }),
            this.prisma.studyMaterial.count({ where }),
        ]);

        return {
            items,
            meta: PaginationUtil.buildPaginationMeta(options.page, options.limit, total),
        };
    }

    async findById(id: string): Promise<StudyMaterial | null> {
        return this.prisma.studyMaterial.findFirst({ where: { id, deletedAt: null } });
    }

    async create(data: StudyMaterialUncheckedCreateInput): Promise<StudyMaterial> {
        return this.prisma.studyMaterial.create({ data });
    }

    async update(id: string, data: StudyMaterialUncheckedUpdateInput): Promise<StudyMaterial> {
        return this.prisma.studyMaterial.update({ where: { id }, data });
    }

    async softDelete(id: string, deletedBy: string): Promise<void> {
        await this.prisma.studyMaterial.update({
            where: { id },
            data: { deletedAt: new Date(), deletedBy },
        });
    }
}
