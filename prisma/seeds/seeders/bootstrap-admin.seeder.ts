import { GenerateUtil, PasswordUtil } from "../../../src/common/utils";
import { PrismaClient, UserStatus } from "../../generated/client";

/**
 * Creates the initial system administrator from environment-driven bootstrap values.
 * Safe and idempotent: no-ops when the env vars are unset, or when a user with the
 * given username/email already exists. Never contains hardcoded accounts or password hashes.
 */
export async function createBootstrapAdmin(prisma: PrismaClient): Promise<{ created: boolean; username?: string }> {
    const email = process.env.BOOTSTRAP_ADMIN_EMAIL;
    const username = process.env.BOOTSTRAP_ADMIN_USERNAME;
    const phone = process.env.BOOTSTRAP_ADMIN_PHONE;
    const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;

    if (!email || !username || !phone || !password) {
        return { created: false };
    }

    const existing = await prisma.user.findFirst({
        where: { OR: [{ username }, { email }] },
    });

    if (existing) {
        return { created: false, username: existing.username };
    }

    const systemRole = await prisma.role.findUnique({
        where: { name: "System" },
    });

    if (!systemRole) {
        throw new Error('Cannot bootstrap admin: "System" role not found. Seed roles first.');
    }

    const passwordHash = await PasswordUtil.hash(password);

    const user = await prisma.user.create({
        data: {
            username,
            email,
            phone,
            passwordHash,
            qrCode: GenerateUtil.qrCode(),
            status: UserStatus.ACTIVE,
            emailVerifiedAt: new Date(),
            phoneVerifiedAt: new Date(),
        },
    });

    await prisma.userRole.create({
        data: {
            userId: user.id,
            roleId: systemRole.id,
            assignedBy: user.id,
        },
    });

    return { created: true, username: user.username };
}
