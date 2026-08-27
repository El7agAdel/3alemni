import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";

import { AppExceptions } from "@common/exceptions";
import { AuthenticatedUser, ExtendedRequest } from "@common/interfaces";
import { ConfigService } from "@config";
import { CacheService } from "@infra/cache";

import { ReAuthCacheKeys, ReAuthMethod } from "../constants/auth.constant";
import { REAUTH_KEY } from "../decorators/reauth.decorator";
import { ReAuthMetadata } from "../interfaces/auth.interface";

@Injectable()
export class ReAuthGuard implements CanActivate {
    private readonly windowSeconds: number;

    constructor(
        private readonly reflector: Reflector,
        private readonly config: ConfigService,
        private readonly cache: CacheService,
    ) {
        this.windowSeconds = this.config.auth.reAuth.windowSeconds;
    }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const metadata = this.reflector.get<ReAuthMetadata>(REAUTH_KEY, context.getHandler());

        if (!metadata) return true;

        const request = context.switchToHttp().getRequest<ExtendedRequest>();
        const user = request.user as AuthenticatedUser;

        const windowKey = ReAuthCacheKeys.WINDOW(user.id);
        const lastReAuth = await this.cache.get<number>(windowKey);

        if (lastReAuth) return true;

        const otpChannel = metadata.method === ReAuthMethod.OTP ? user.otpChannel : undefined;

        throw AppExceptions.reAuthRequired({
            windowSeconds: this.windowSeconds,
            method: metadata.method,
            otpChannel,
        });
    }
}
