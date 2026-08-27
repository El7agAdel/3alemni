import { GenerateUtil } from "../../../src/common/utils";
import { PrismaClient, UserStatus } from "../../generated/client";

export interface UserSeedData {
    username: string;
    email: string;
    phone: string;
    passwordHash: string;
    roles: string[];
}

/**
 * Seeds a fixed set of known dev/test accounts (root/admin/test-user).
 * Intended for local development and QA only - callers must gate this out of production seeding.
 */
export async function createUsers(
    prisma: PrismaClient,
    users: UserSeedData[],
): Promise<{ created: number; updated: number }> {
    let created = 0;
    let updated = 0;

    for (const user of users) {
        const existing = await prisma.user.findUnique({
            where: { username: user.username },
        });

        const roles = await prisma.role.findMany({
            where: { name: { in: user.roles } },
        });

        const missingRoles = user.roles.filter((name) => !roles.some((role) => role.name === name));

        if (missingRoles.length > 0) {
            throw new Error(`Missing roles for user "${user.username}": ${missingRoles.join(", ")}`);
        }

        const createdUser = await prisma.user.upsert({
            where: { username: user.username },
            update: {
                email: user.email,
                phone: user.phone,
            },
            create: {
                username: user.username,
                email: user.email,
                phone: user.phone,
                passwordHash: user.passwordHash,
                qrCode: GenerateUtil.qrCode(),
                status: UserStatus.ACTIVE,
                emailVerifiedAt: new Date(),
                phoneVerifiedAt: new Date(),
            },
        });

        if (existing) {
            updated++;
            // Reset roles on update so re-seeding reflects the current data file
            await prisma.userRole.deleteMany({
                where: { userId: createdUser.id },
            });
        } else {
            created++;
        }

        if (roles.length > 0) {
            await prisma.userRole.createMany({
                data: roles.map((role) => ({
                    userId: createdUser.id,
                    roleId: role.id,
                    assignedBy: createdUser.id,
                })),
                skipDuplicates: true,
            });
        }
    }

    return { created, updated };
}
