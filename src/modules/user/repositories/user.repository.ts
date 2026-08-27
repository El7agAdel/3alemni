import { Injectable } from "@nestjs/common";

import { ListQueryOptions, PaginatedResult, QueryOptions } from "@common/interfaces";
import { GenerateUtil, PaginationUtil } from "@common/utils";
import { OtpChannel, User, UserStatus } from "@generated/client";
import { UserCreateInput } from "@generated/models";
import { PrismaService } from "@infra/database";

@Injectable()
export class UserRepository {
    constructor(private readonly prisma: PrismaService) {}

    async list(options: ListQueryOptions): Promise<PaginatedResult<User>> {
        const skip = (options.page - 1) * options.limit;

        const include = {
            ...options.include,
            _count: { select: { userRoles: true } },
        };

        const [items, total] = await Promise.all([
            this.prisma.user.findMany({
                where: options.where,
                orderBy: options.orderBy,
                include,
                skip,
                take: options.limit,
            }),
            this.prisma.user.count({ where: options.where }),
        ]);

        return {
            items,
            meta: PaginationUtil.buildPaginationMeta(options.page, options.limit, total),
        };
    }

    async findAll(options?: QueryOptions): Promise<User[]> {
        return this.prisma.user.findMany({
            where: options?.where,
            orderBy: options?.orderBy,
            include: options?.include,
        });
    }

    async findManyByIds(
        ids: string[],
    ): Promise<
        Pick<User, "id" | "username" | "email" | "phone" | "displayName" | "firstName" | "lastName" | "avatar">[]
    > {
        return this.prisma.user.findMany({
            where: { id: { in: ids } },
            select: {
                id: true,
                username: true,
                email: true,
                phone: true,
                displayName: true,
                firstName: true,
                lastName: true,
                avatar: true,
            },
        });
    }

    async findIdsBy(options?: Pick<QueryOptions, "where" | "orderBy">): Promise<string[]> {
        const users = await this.prisma.user.findMany({
            where: options?.where,
            orderBy: options?.orderBy,
            select: { id: true },
        });

        return users.map((u) => u.id);
    }

    async findById(id: string): Promise<User | null> {
        return this.prisma.user.findUnique({ where: { id } });
    }

    async findByIdWithDetails(id: string): Promise<User | null> {
        return this.prisma.user.findUnique({
            where: { id },
            include: {
                userRoles: {
                    include: { role: true },
                    orderBy: { assignedAt: "asc" as const },
                },
                _count: {
                    select: {
                        userRoles: true,
                        sessions: true,
                    },
                },
            },
        });
    }

    async findActiveById(id: string): Promise<User | null> {
        return this.prisma.user.findFirst({
            where: { id, status: UserStatus.ACTIVE },
        });
    }

    async findByIdentifier(identifier: string): Promise<User | null> {
        const normalized = identifier.toLowerCase().trim();

        return this.prisma.user.findFirst({
            where: {
                OR: [{ email: normalized }, { phone: identifier }, { username: normalized }],
            },
        });
    }

    async findByEmail(email: string): Promise<User | null> {
        return this.prisma.user.findUnique({
            where: { email: email.toLowerCase() },
        });
    }

    async findByPhone(phone: string): Promise<User | null> {
        return this.prisma.user.findUnique({ where: { phone } });
    }

    async findByUsername(username: string): Promise<User | null> {
        return this.prisma.user.findUnique({
            where: { username: username.toLowerCase() },
        });
    }

    async findByQrCode(qrCode: string): Promise<User | null> {
        return this.prisma.user.findUnique({ where: { qrCode } });
    }

    async createRegisteredUser(data: Omit<UserCreateInput, "qrCode">): Promise<User> {
        return this.prisma.user.create({
            data: {
                username: data.username.toLowerCase(),
                email: data.email.toLowerCase(),
                phone: data.phone,
                passwordHash: data.passwordHash,
                qrCode: GenerateUtil.qrCode(),
                displayName: data.displayName ?? data.username,
                otpChannel: data.otpChannel,
                emailVerifiedAt: data.emailVerifiedAt,
                phoneVerifiedAt: data.phoneVerifiedAt,
                firstName: data.firstName,
                lastName: data.lastName,
                avatar: data.avatar,
            },
        });
    }

    async updateProfile(
        id: string,
        data: {
            username?: string;
            firstName?: string;
            lastName?: string;
            displayName?: string;
            avatar?: string;
            language?: string;
            isNewsletterSubscribed?: boolean;
        },
    ): Promise<User> {
        return this.prisma.user.update({
            where: { id },
            data,
        });
    }

    async updatePasswordHash(id: string, passwordHash: string): Promise<void> {
        await this.prisma.user.update({
            where: { id },
            data: { passwordHash },
        });
    }

    async updateStatus(id: string, status: UserStatus, deletionRequestedAt?: Date | null): Promise<void> {
        await this.prisma.user.update({
            where: { id },
            data: { status, deletionRequestedAt },
        });
    }

    async updateTwoFactor(id: string, isTwoFactorOn: boolean, channel?: OtpChannel): Promise<void> {
        await this.prisma.user.update({
            where: { id },
            data: {
                isTwoFactorOn,
                ...(channel && { otpChannel: channel }),
            },
        });
    }

    async updateEmail(id: string, email: string): Promise<void> {
        await this.prisma.user.update({
            where: { id },
            data: { email: email.toLowerCase() },
        });
    }

    async updatePhone(id: string, phone: string): Promise<void> {
        await this.prisma.user.update({
            where: { id },
            data: { phone },
        });
    }

    async setEmailVerified(id: string): Promise<void> {
        await this.prisma.user.update({
            where: { id },
            data: { emailVerifiedAt: new Date() },
        });
    }

    async setPhoneVerified(id: string): Promise<void> {
        await this.prisma.user.update({
            where: { id },
            data: { phoneVerifiedAt: new Date() },
        });
    }

    async deleteUser(id: string) {
        await this.prisma.user.delete({ where: { id } });
    }

    /**
     * Soft-delete: strips personal data and marks the account DELETED instead of a hard delete.
     * Used for the self-service deletion grace-period flow; admins can still hard-delete via deleteUser.
     */
    async anonymize(id: string): Promise<void> {
        const prefix = `[deleted_${GenerateUtil.randomString(6)}]`;

        const user = await this.findById(id);

        if (!user) return;

        await this.prisma.$transaction([
            this.prisma.user.update({
                where: { id },
                data: {
                    username: `${prefix}${user.username}`,
                    email: `${prefix}${user.email}`,
                    phone: `${prefix}${user.phone}`,
                    passwordHash: GenerateUtil.randomString(32),
                    emailVerifiedAt: null,
                    phoneVerifiedAt: null,
                    isTwoFactorOn: false,
                    qrCode: GenerateUtil.qrCode(),
                    status: UserStatus.DELETED,
                    deletionRequestedAt: null,
                },
            }),

            this.prisma.otp.deleteMany({
                where: {
                    OR: [{ identifier: user.email }, { identifier: user.phone }],
                },
            }),
        ]);
    }

    async clearEmailVerification(id: string): Promise<void> {
        await this.prisma.user.update({
            where: { id },
            data: { emailVerifiedAt: null },
        });
    }

    async clearPhoneVerification(id: string): Promise<void> {
        await this.prisma.user.update({
            where: { id },
            data: { phoneVerifiedAt: null },
        });
    }

    async findExpiredDeletionRequests(retentionDays: number): Promise<User[]> {
        const deleteBefore = new Date();
        deleteBefore.setDate(deleteBefore.getDate() - retentionDays);

        return this.prisma.user.findMany({
            where: {
                status: UserStatus.PENDING_DELETION,
                deletionRequestedAt: { lt: deleteBefore },
            },
        });
    }

    async searchIdsByTerm(term: string, limit = 100): Promise<string[]> {
        const users = await this.prisma.user.findMany({
            where: {
                OR: [
                    { username: { contains: term, mode: "insensitive" } },
                    { email: { contains: term, mode: "insensitive" } },
                    { phone: { contains: term } },
                    { firstName: { contains: term, mode: "insensitive" } },
                    { lastName: { contains: term, mode: "insensitive" } },
                ],
            },
            select: { id: true },
            take: limit,
        });

        return users.map((u) => u.id);
    }

    async count(options?: QueryOptions): Promise<number> {
        return this.prisma.user.count({ where: options?.where });
    }
}
