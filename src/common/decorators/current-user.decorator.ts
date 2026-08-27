import { createParamDecorator } from "@nestjs/common";

import { AuthenticatedUser, ExtendedRequest } from "@common/interfaces";

/**
 * Provides the current authenticated user, extracted from the request.
 * Populated by JwtAuthGuard after successful authentication.
 */
export const CurrentUser = createParamDecorator<keyof AuthenticatedUser | undefined>((data, ctx) => {
    const request = ctx.switchToHttp().getRequest<ExtendedRequest>();
    const user = request.user;

    if (!user) return null;

    return data ? user[data] : user;
});
