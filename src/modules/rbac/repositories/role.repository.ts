import { Injectable } from "@nestjs/common";

import { ListQueryOptions, PaginatedResult, QueryOptions } from "@common/interfaces";
import { PaginationUtil } from "@common/utils";
import { Permission, Role } from "@generated/client";
import { RoleCreateInput } from "@generated/models";
import { PrismaService } from "@infra/database";

@Injectable()
export class RoleRepository {
    constructor(private readonly prisma: PrismaService) {}

    async list(options: ListQueryOptions): Promise<PaginatedResult<Role>> {
        const skip = (options.page - 1) * options.limit;

        const include = {
            ...options.include,
            _count: { select: { userRoles: true, rolePermissions: true } },
        };

        const [items, total] = await Promise.all([
            this.prisma.role.findMany({
                where: options.where,
                orderBy: options.orderBy,
                include: include,
                skip,
                take: options.limit,
            }),
            this.prisma.role.count({ where: options.where }),
        ]);

        return {
            items,
            meta: PaginationUtil.buildPaginationMeta(options.page, options.limit, total),
        };
    }

    async findAll(options?: QueryOptions): Promise<Role[]> {
        return this.prisma.role.findMany({
            where: options?.where,
            orderBy: options?.orderBy,
            include: options?.include,
        });
    }

    async findById(id: string): Promise<Role | null> {
        return this.prisma.role.findUnique({ where: { id } });
    }

    async findByName(name: string): Promise<Role | null> {
        return this.prisma.role.findUnique({ where: { name } });
    }

    async findManyByIds(ids: string[]): Promise<Role[]> {
        return this.prisma.role.findMany({
            where: { id: { in: ids } },
        });
    }

    async findByIdWithDetails(id: string): Promise<Role | null> {
        return this.prisma.role.findUnique({
            where: { id },
            include: {
                rolePermissions: {
                    include: { permission: true },
                },
                _count: { select: { userRoles: true, rolePermissions: true } },
            },
        });
    }

    async create(data: RoleCreateInput): Promise<Role> {
        return this.prisma.role.create({
            data: {
                name: data.name,
                description: data.description,
                isSystem: false,
            },
        });
    }

    async update(id: string, data: { name?: string; description?: string }): Promise<Role> {
        return this.prisma.role.update({
            where: { id },
            data,
        });
    }

    async delete(id: string): Promise<void> {
        await this.prisma.role.delete({ where: { id } });
    }

    async getRolePermissions(roleId: string): Promise<Permission[]> {
        const rolePermissions = await this.prisma.rolePermission.findMany({
            where: { roleId },
            include: { permission: true },
        });

        return rolePermissions.map((rp) => rp.permission);
    }

    async setRolePermissions(roleId: string, permissionIds: string[]): Promise<void> {
        await this.prisma.$transaction([
            this.prisma.rolePermission.deleteMany({ where: { roleId } }),

            this.prisma.rolePermission.createMany({
                data: permissionIds.map((permissionId) => ({ roleId, permissionId })),
                skipDuplicates: true,
            }),
        ]);
    }

    async countUsersWithRole(roleId: string): Promise<number> {
        return this.prisma.userRole.count({ where: { roleId } });
    }
}
