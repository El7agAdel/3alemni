import { Request } from "express";

import { User } from "@generated/client";

/**
 * An enhanced user object with additional fields resolved from the JWT payload/session.
 */
export interface AuthenticatedUser extends User {
    sessionId: string;
    roles: string[];
    permissions: string[];
    hasSystemRole: boolean;
}

/**
 * Extended request with request context.
 * `user` is only available after authentication guards pass.
 */
export interface ExtendedRequest extends Request {
    requestId: string;
    startTime: number;
    clientIp: string;
    userAgent: string;
    user?: AuthenticatedUser;
}
