import { Injectable } from "@nestjs/common";

import { Role, UserRole } from "@generated/client";
import { PrismaService } from "@infra/database";

export interface UserRoleWithRole extends UserRole {
    role: Role;
}

@Injectable()
export class UserRoleRepository {
    constructor(private readonly prisma: PrismaService) {}

    async findByUserId(userId: string): Promise<UserRoleWithRole[]> {
        return this.prisma.userRole.findMany({
            where: { userId },
            include: { role: true },
        });
    }

    async findByUserIdAndRoleId(userId: string, roleId: string): Promise<UserRoleWithRole | null> {
        return this.prisma.userRole.findUnique({
            where: { userId_roleId: { userId, roleId } },
            include: { role: true },
        });
    }

    async setRoles(
        userId: string,
        roleIds: string[],
        assignedBy: string,
    ): Promise<{ added: string[]; removed: string[] }> {
        const current = await this.prisma.userRole.findMany({
            where: { userId },
            select: { roleId: true },
        });
        const currentIds = current.map((userRole) => userRole.roleId);

        const toRemove = currentIds.filter((id) => !roleIds.includes(id));
        const toAdd = roleIds.filter((id) => !currentIds.includes(id));

        if (toRemove.length > 0 || toAdd.length > 0) {
            await this.prisma.$transaction([
                this.prisma.userRole.deleteMany({
                    where: { userId, roleId: { in: toRemove } },
                }),
                this.prisma.userRole.createMany({
                    data: toAdd.map((roleId) => ({ userId, roleId, assignedBy })),
                    skipDuplicates: true,
                }),
            ]);
        }

        return { added: toAdd, removed: toRemove };
    }

    async assign(userId: string, roleId: string, assignedBy: string): Promise<void> {
        await this.prisma.userRole.createMany({
            data: [{ userId, roleId, assignedBy }],
            skipDuplicates: true,
        });
    }

    async remove(userId: string, roleId: string): Promise<void> {
        await this.prisma.userRole.delete({
            where: { userId_roleId: { userId, roleId } },
        });
    }

    async getUserIdsWithRole(roleId: string): Promise<string[]> {
        const userRoles = await this.prisma.userRole.findMany({
            where: { roleId },
            select: { userId: true },
        });

        return userRoles.map((userRole) => userRole.userId);
    }

    async hasSystemRole(userId: string): Promise<boolean> {
        const systemRole = await this.prisma.userRole.findFirst({
            where: {
                userId,
                role: { isSystem: true },
            },
        });

        return systemRole !== null;
    }
}
