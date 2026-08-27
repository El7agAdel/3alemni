import { Injectable } from "@nestjs/common";

import { DeviceToken, Prisma } from "@generated/client";
import { PrismaService } from "@infra/database";

@Injectable()
export class DeviceTokenRepository {
    constructor(private readonly prisma: PrismaService) {}

    async listByUserId(userId: string): Promise<DeviceToken[]> {
        return this.prisma.deviceToken.findMany({
            where: { userId },
            orderBy: { lastSeenAt: "desc" },
        });
    }

    async listByUserIds(userIds: string[]): Promise<DeviceToken[]> {
        if (userIds.length === 0) return [];

        return this.prisma.deviceToken.findMany({
            where: { userId: { in: userIds } },
        });
    }

    async findById(id: string): Promise<DeviceToken | null> {
        return this.prisma.deviceToken.findUnique({ where: { id } });
    }

    async findByToken(token: string): Promise<DeviceToken | null> {
        return this.prisma.deviceToken.findUnique({ where: { token } });
    }

    async findByUserAndDevice(userId: string, deviceId: string): Promise<DeviceToken | null> {
        return this.prisma.deviceToken.findUnique({
            where: { userId_deviceId: { userId, deviceId } },
        });
    }

    async create(data: Prisma.DeviceTokenUncheckedCreateInput): Promise<DeviceToken> {
        return this.prisma.deviceToken.create({ data });
    }

    async update(id: string, data: Prisma.DeviceTokenUpdateInput): Promise<DeviceToken> {
        return this.prisma.deviceToken.update({ where: { id }, data });
    }

    async delete(id: string): Promise<void> {
        await this.prisma.deviceToken.delete({ where: { id } });
    }

    async deleteByDeviceIdExceptUser(deviceId: string, userId: string): Promise<{ count: number }> {
        return this.prisma.deviceToken.deleteMany({
            where: { deviceId, userId: { not: userId } },
        });
    }

    async deleteOlderThan(beforeDate: Date): Promise<{ count: number }> {
        return this.prisma.deviceToken.deleteMany({
            where: { lastSeenAt: { lt: beforeDate } },
        });
    }
}
