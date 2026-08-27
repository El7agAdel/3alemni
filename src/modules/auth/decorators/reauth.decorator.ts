import { applyDecorators, SetMetadata, UseGuards } from "@nestjs/common";

import { ReAuthMethod } from "../constants/auth.constant";
import { ReAuthGuard } from "../guards";
import { ReAuthMetadata, ReAuthOptions } from "../interfaces/auth.interface";

export const REAUTH_KEY = "reauth";

/**
 * Requires re-authentication before accessing a specific route.
 * Sets the incoming options as metadata for the route and applies ReAuthGuard.
 */
export const ReAuth = (options?: ReAuthOptions) => {
    const metadata: ReAuthMetadata = {
        method: options?.method ?? ReAuthMethod.PASSWORD,
    };

    return applyDecorators(SetMetadata(REAUTH_KEY, metadata), UseGuards(ReAuthGuard));
};
