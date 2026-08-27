import { Injectable } from "@nestjs/common";

import { ListQueryOptions, PaginatedResult } from "@common/interfaces";
import { PaginationUtil } from "@common/utils";
import { Notification, Prisma } from "@generated/client";
import { PrismaService } from "@infra/database";

@Injectable()
export class NotificationRepository {
    constructor(private readonly prisma: PrismaService) {}

    async list(options: ListQueryOptions): Promise<PaginatedResult<Notification>> {
        const skip = (options.page - 1) * options.limit;

        const [items, total] = await Promise.all([
            this.prisma.notification.findMany({
                where: options.where,
                orderBy: options.orderBy,
                skip,
                take: options.limit,
            }),
            this.prisma.notification.count({ where: options.where }),
        ]);

        return {
            items,
            meta: PaginationUtil.buildPaginationMeta(options.page, options.limit, total),
        };
    }

    async findById(id: string): Promise<Notification | null> {
        return this.prisma.notification.findUnique({ where: { id } });
    }

    async create(data: Prisma.NotificationUncheckedCreateInput): Promise<Notification> {
        return this.prisma.notification.create({ data });
    }

    async update(id: string, data: Prisma.NotificationUpdateInput): Promise<Notification> {
        return this.prisma.notification.update({ where: { id }, data });
    }

    async countUnreadForUser(userId: string): Promise<number> {
        return this.prisma.notification.count({
            where: { userId, readAt: null },
        });
    }

    async markAllReadForUser(userId: string): Promise<{ count: number }> {
        return this.prisma.notification.updateMany({
            where: { userId, readAt: null },
            data: { readAt: new Date() },
        });
    }

    async deleteOlderThan(beforeDate: Date): Promise<{ count: number }> {
        return this.prisma.notification.deleteMany({
            where: { createdAt: { lt: beforeDate } },
        });
    }
}
