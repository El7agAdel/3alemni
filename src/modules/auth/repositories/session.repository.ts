import { Injectable } from "@nestjs/common";

import { Session } from "@generated/client";
import { PrismaService } from "@infra/database";

import { SessionMetadata } from "../interfaces/auth.interface";

@Injectable()
export class SessionRepository {
    constructor(private readonly prisma: PrismaService) {}

    async findById(id: string): Promise<Session | null> {
        return this.prisma.session.findUnique({
            where: { id },
        });
    }

    async findByRefreshToken(hashedToken: string): Promise<Session | null> {
        return this.prisma.session.findUnique({
            where: { refreshToken: hashedToken },
        });
    }

    async findAllByUser(userId: string): Promise<Session[]> {
        return this.prisma.session.findMany({
            where: {
                userId,
                expiresAt: { gt: new Date() },
            },
            orderBy: { lastActiveAt: "desc" },
        });
    }

    async countByUser(userId: string): Promise<number> {
        return this.prisma.session.count({
            where: {
                userId,
                expiresAt: { gt: new Date() },
            },
        });
    }

    async create(data: {
        userId: string;
        refreshToken: string;
        metadata: SessionMetadata;
        expiresAt: Date;
    }): Promise<Session> {
        return this.prisma.session.create({
            data: {
                userId: data.userId,
                refreshToken: data.refreshToken,
                deviceType: data.metadata.deviceType,
                deviceName: data.metadata.deviceName,
                ipAddress: data.metadata.ipAddress,
                userAgent: data.metadata.userAgent,
                expiresAt: data.expiresAt,
            },
        });
    }

    async update(id: string, data: { refreshToken: string; expiresAt: Date; lastActiveAt?: Date }): Promise<Session> {
        return this.prisma.session.update({
            where: { id },
            data: {
                refreshToken: data.refreshToken,
                expiresAt: data.expiresAt,
                lastActiveAt: data.lastActiveAt || new Date(),
            },
        });
    }

    async delete(id: string): Promise<void> {
        await this.prisma.session.delete({ where: { id } }).catch(() => {});
    }

    async deleteAllForUser(userId: string, excludeId?: string): Promise<number> {
        const result = await this.prisma.session.deleteMany({
            where: {
                userId,
                ...(excludeId ? { id: { not: excludeId } } : {}),
            },
        });

        return result.count;
    }

    async deleteOldest(userId: string): Promise<void> {
        const oldest = await this.prisma.session.findFirst({
            where: { userId },
            orderBy: { createdAt: "asc" },
        });

        if (oldest) {
            await this.prisma.session.delete({ where: { id: oldest.id } });
        }
    }

    async deleteExpired(): Promise<number> {
        const result = await this.prisma.session.deleteMany({
            where: { expiresAt: { lt: new Date() } },
        });

        return result.count;
    }
}
