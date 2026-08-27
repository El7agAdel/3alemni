import { Injectable } from "@nestjs/common";

import { ListQueryOptions, PaginatedResult } from "@common/interfaces";
import { PaginationUtil } from "@common/utils";
import { AuditLog, Prisma } from "@generated/client";
import { PrismaService } from "@infra/database";

@Injectable()
export class AuditRepository {
    constructor(private readonly prisma: PrismaService) {}

    async list(options: ListQueryOptions): Promise<PaginatedResult<AuditLog>> {
        const skip = (options.page - 1) * options.limit;

        const [items, total] = await Promise.all([
            this.prisma.auditLog.findMany({
                where: options.where,
                orderBy: options.orderBy,
                skip,
                take: options.limit,
            }),
            this.prisma.auditLog.count({ where: options.where }),
        ]);

        return {
            items,
            meta: PaginationUtil.buildPaginationMeta(options.page, options.limit, total),
        };
    }

    async findById(id: string): Promise<AuditLog | null> {
        return this.prisma.auditLog.findUnique({ where: { id } });
    }

    async create(data: Prisma.AuditLogCreateInput): Promise<void> {
        await this.prisma.auditLog.create({ data });
    }
}
