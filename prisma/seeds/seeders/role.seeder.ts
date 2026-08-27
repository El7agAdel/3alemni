import { PrismaClient } from "../../generated/client";

export interface RoleSeedData {
    name: string;
    description?: string;
    isSystem?: boolean;
    permissions: readonly string[];
}

/**
 * Creates roles and returns the number of created and updated roles.
 * Idempotent - safe to run repeatedly.
 */
export async function createRoles(
    prisma: PrismaClient,
    roles: RoleSeedData[],
): Promise<{ created: number; updated: number }> {
    let created = 0;
    let updated = 0;

    for (const role of roles) {
        const existing = await prisma.role.findUnique({
            where: { name: role.name },
        });

        const createdRole = await prisma.role.upsert({
            where: { name: role.name },
            update: {
                description: role.description,
            },
            create: {
                name: role.name,
                description: role.description,
                isSystem: role.isSystem ?? false,
            },
        });

        if (existing) updated++;
        else created++;

        const permissions = await prisma.permission.findMany({
            where: { key: { in: [...role.permissions] } },
            select: { id: true, key: true },
        });

        await prisma.rolePermission.deleteMany({
            where: { roleId: createdRole.id },
        });

        if (permissions.length) {
            await prisma.rolePermission.createMany({
                data: permissions.map((permission) => ({
                    roleId: createdRole.id,
                    permissionId: permission.id,
                })),
                skipDuplicates: true,
            });
        }
    }

    return { created, updated };
}
