import { Injectable } from "@nestjs/common";
import { ThrottlerGuard, ThrottlerLimitDetail, ThrottlerRequest } from "@nestjs/throttler";

import { AppExceptions } from "@common/exceptions";
import { ExtendedRequest } from "@common/interfaces";

/**
 * Custom throttler guard that identifies clients.
 * Authenticated users are throttled based on user id.
 * Anonymous users are throttled based on IP address.
 */
@Injectable()
export class ThrottlerProxyGuard extends ThrottlerGuard {
    protected async getTracker(req: ThrottlerRequest): Promise<string> {
        const request = req as unknown as ExtendedRequest;

        const userId = request.user?.id;

        if (userId) return Promise.resolve(`user:${userId}`);

        const ip = request.clientIp || request.ip || "unknown";

        return Promise.resolve(`ip:${ip}`);
    }

    protected throwThrottlingException(_context: unknown, throttlerLimitDetail: ThrottlerLimitDetail): Promise<void> {
        throw AppExceptions.rateLimitExceeded({
            retryAfter: Math.ceil(throttlerLimitDetail.timeToExpire / 1000),
            limit: throttlerLimitDetail.limit,
            remaining: 0,
            resetTime: Date.now() + throttlerLimitDetail.timeToExpire,
        });
    }
}
