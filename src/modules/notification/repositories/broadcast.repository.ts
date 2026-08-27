import { Injectable } from "@nestjs/common";

import { ListQueryOptions, PaginatedResult } from "@common/interfaces";
import { PaginationUtil } from "@common/utils";
import { Broadcast, Prisma } from "@generated/client";
import { PrismaService } from "@infra/database";

@Injectable()
export class BroadcastRepository {
    constructor(private readonly prisma: PrismaService) {}

    async list(options: ListQueryOptions): Promise<PaginatedResult<Broadcast>> {
        const skip = (options.page - 1) * options.limit;

        const [items, total] = await Promise.all([
            this.prisma.broadcast.findMany({
                where: options.where,
                orderBy: options.orderBy,
                skip,
                take: options.limit,
            }),
            this.prisma.broadcast.count({ where: options.where }),
        ]);

        return {
            items,
            meta: PaginationUtil.buildPaginationMeta(options.page, options.limit, total),
        };
    }

    async findById(id: string): Promise<Broadcast | null> {
        return this.prisma.broadcast.findUnique({ where: { id } });
    }

    async create(data: Prisma.BroadcastUncheckedCreateInput): Promise<Broadcast> {
        return this.prisma.broadcast.create({ data });
    }

    async update(id: string, data: Prisma.BroadcastUpdateInput): Promise<Broadcast> {
        return this.prisma.broadcast.update({ where: { id }, data });
    }
}
