import { Injectable } from "@nestjs/common";

import { Permission } from "@generated/client";
import { PrismaService } from "@infra/database";

@Injectable()
export class PermissionRepository {
    constructor(private readonly prisma: PrismaService) {}

    async findAll(): Promise<Permission[]> {
        return this.prisma.permission.findMany({
            orderBy: { group: "asc" },
        });
    }

    async findByKey(key: string): Promise<Permission | null> {
        return this.prisma.permission.findUnique({ where: { key } });
    }

    async findByKeys(keys: string[]): Promise<Permission[]> {
        return this.prisma.permission.findMany({
            where: { key: { in: keys } },
        });
    }

    async findByUserId(userId: string): Promise<Pick<Permission, "key">[]> {
        return this.prisma.permission.findMany({
            where: {
                rolePermissions: {
                    some: {
                        role: { userRoles: { some: { userId } } },
                    },
                },
            },
            select: { key: true },
            distinct: ["key"],
        });
    }
}
