import { Injectable } from "@nestjs/common";

import { ListQueryOptions, PaginatedResult, QueryOptions } from "@common/interfaces";
import { PaginationUtil } from "@common/utils";
import { Upload } from "@generated/client";
import { UploadCreateInput } from "@generated/models";
import { PrismaService } from "@infra/database";

@Injectable()
export class UploadRepository {
    constructor(private readonly prisma: PrismaService) {}

    async list(options: ListQueryOptions): Promise<PaginatedResult<Upload>> {
        const skip = (options.page - 1) * options.limit;

        const [items, total] = await Promise.all([
            this.prisma.upload.findMany({
                where: options.where,
                orderBy: options.orderBy,
                skip,
                take: options.limit,
            }),
            this.prisma.upload.count({ where: options.where }),
        ]);

        return {
            items,
            meta: PaginationUtil.buildPaginationMeta(options.page, options.limit, total),
        };
    }

    async findAll(options?: QueryOptions): Promise<Upload[]> {
        return this.prisma.upload.findMany({
            where: options?.where,
            orderBy: options?.orderBy,
        });
    }

    async findById(id: string): Promise<Upload | null> {
        return this.prisma.upload.findUnique({ where: { id } });
    }

    async findByKey(key: string): Promise<Upload | null> {
        return this.prisma.upload.findUnique({ where: { key } });
    }

    async findByOwner(purpose: string, ownerId: string): Promise<Upload[]> {
        return this.prisma.upload.findMany({
            where: { uploadableId: ownerId, purpose },
        });
    }

    async create(data: UploadCreateInput): Promise<Upload> {
        return this.prisma.upload.create({ data });
    }

    async attach(key: string, ownerId: string): Promise<void> {
        await this.prisma.upload.update({
            where: { key },
            data: { uploadableId: ownerId },
        });
    }

    async delete(id: string): Promise<void> {
        await this.prisma.upload.delete({ where: { id } });
    }

    async deleteByKey(key: string): Promise<void> {
        await this.prisma.upload.delete({ where: { key } });
    }

    async findOrphans(cutoff: Date): Promise<Pick<Upload, "id" | "key">[]> {
        return this.prisma.upload.findMany({
            where: { uploadableId: null, createdAt: { lt: cutoff } },
            select: { id: true, key: true },
        });
    }
}
