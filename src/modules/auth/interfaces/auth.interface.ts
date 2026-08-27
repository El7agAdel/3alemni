import { OtpChannel, Session, User } from "@generated/client";

import { ReAuthMethod, TransactionalTokenType } from "../constants/auth.constant";

/**
 * JWT access token payload.
 */
export interface JwtPayload {
    sub: string;
    email: string;
    sessionId: string;
    jti: string;
    iat: number;
    exp: number;
    iss: string;
    aud: string;
}

/**
 * Result data for successful authentication.
 */
export interface AuthTokenResult {
    user: User;
    accessToken: string;
    refreshToken: string;
}

/**
 * Result for login completion, whether by normal login or after a 2FA challenge.
 */
export interface LoginCompleteResult extends AuthTokenResult {
    twoFactorRequired: false;
    accountRestored: boolean;
}

/**
 * Result for initiating a 2FA login challenge.
 */
export interface LoginTwoFactorPendingResult {
    twoFactorRequired: true;
    accountRestored: boolean;
    transactionalToken: string;
    channel: OtpChannel;
}

/**
 * Result for normal login, depending on whether 2FA is on or not.
 */
export type LoginResult = LoginCompleteResult | LoginTwoFactorPendingResult;

/**
 * Options for the re-authentication decorator.
 */
export interface ReAuthOptions {
    method?: ReAuthMethod;
}

/**
 * Metadata returned from the re-authentication decorator.
 */
export interface ReAuthMetadata extends ReAuthOptions {
    method: ReAuthMethod;
}

/**
 * Session metadata from the client request.
 */
export interface SessionMetadata {
    deviceType?: string;
    deviceName?: string;
    ipAddress?: string;
    userAgent?: string;
}

/**
 * Session info for client listing. Adds extra fields on top of database fields.
 */
export interface SessionInfo extends Session {
    isCurrent: boolean;
}

/**
 * Payload types for each transactional token.
 */
export interface TransactionalTokenPayloads {
    [TransactionalTokenType.REGISTER_OTP_PENDING]: {
        identifier: string;
        channel: OtpChannel;
    };

    [TransactionalTokenType.REGISTER_COMPLETE]: {
        username: string;
        email: string;
        phone: string;
        channel: OtpChannel;
    };

    [TransactionalTokenType.TWO_FACTOR_LOGIN]: {
        userId: string;
        identifier: string;
        accountRestored?: boolean;
    };

    [TransactionalTokenType.PASSWORD_RESET_OTP_PENDING]: {
        identifier: string;
        channel: OtpChannel;
        userId: string;
    };

    [TransactionalTokenType.PASSWORD_RESET_COMPLETE]: {
        userId: string;
    };
}
