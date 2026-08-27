import { PrismaClient } from "../../generated/client";

export interface PermissionSeedData {
    key: string;
    resource: string;
    action: string;
    displayName: string;
    description?: string;
    group: string;
}

/**
 * Creates permissions from a list and returns the number of created and updated permissions.
 * Idempotent - safe to run repeatedly.
 */
export async function createPermissions(
    prisma: PrismaClient,
    permissions: PermissionSeedData[],
): Promise<{ created: number; updated: number }> {
    let created = 0;
    let updated = 0;

    for (const perm of permissions) {
        const existing = await prisma.permission.findUnique({
            where: { key: perm.key },
        });

        await prisma.permission.upsert({
            where: { key: perm.key },
            update: {
                resource: perm.resource,
                action: perm.action,
                displayName: perm.displayName,
                description: perm.description ?? null,
                group: perm.group,
            },
            create: {
                key: perm.key,
                resource: perm.resource,
                action: perm.action,
                displayName: perm.displayName,
                description: perm.description ?? null,
                group: perm.group,
            },
        });

        if (existing) updated++;
        else created++;
    }

    return { created, updated };
}
