import { Injectable } from "@nestjs/common";

import { Otp, OtpPurpose } from "@generated/client";
import { OtpCreateInput } from "@generated/models/Otp";
import { PrismaService } from "@infra/database";

@Injectable()
export class OtpRepository {
    constructor(private readonly prisma: PrismaService) {}

    /**
     * Create a new OTP record.
     */
    async create(data: OtpCreateInput): Promise<Otp> {
        return this.prisma.otp.create({
            data: {
                identifier: data.identifier,
                purpose: data.purpose,
                channel: data.channel,
                code: data.code,
                expiresAt: data.expiresAt,
            },
        });
    }

    /**
     * Find the latest unused and non-expired OTP for the same identifier and purpose.
     */
    async findLatestActive(identifier: string, purpose: OtpPurpose): Promise<Otp | null> {
        return this.prisma.otp.findFirst({
            where: {
                identifier,
                purpose,
                isUsed: false,
                expiresAt: { gt: new Date() },
            },
            orderBy: { createdAt: "desc" },
        });
    }

    /**
     * Invalidate all unused OTPs for identifier and purpose.
     */
    async invalidateAll(identifier: string, purpose: OtpPurpose): Promise<void> {
        await this.prisma.otp.updateMany({
            where: {
                identifier,
                purpose,
                isUsed: false,
            },
            data: { isUsed: true },
        });
    }

    /**
     * Mark OTP as used.
     */
    async markUsed(id: string): Promise<void> {
        await this.prisma.otp.update({
            where: { id },
            data: { isUsed: true },
        });
    }

    /**
     * Delete expired OTPs.
     */
    async deleteExpired(): Promise<number> {
        const result = await this.prisma.otp.deleteMany({
            where: { expiresAt: { lt: new Date() } },
        });

        return result.count;
    }

    /**
     * Delete all used OTPs older than a given date.
     */
    async deleteUsedBefore(date: Date): Promise<number> {
        const result = await this.prisma.otp.deleteMany({
            where: {
                isUsed: true,
                createdAt: { lt: date },
            },
        });

        return result.count;
    }
}
