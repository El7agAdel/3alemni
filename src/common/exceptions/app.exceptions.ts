import { ErrorCode } from "../constants";
import type { RateLimitErrorDetail } from "../interfaces";

import {
    AuthenticationException,
    AuthorizationException,
    BadRequestException,
    ConflictException,
    NotFoundException,
    RateLimitException,
    SystemException,
    ValidationException,
} from "./app.exception";

/**
 * Factory for application and infrastructure exceptions.
 * Uses the base HTTP errors to generate custom exceptions.
 */
export const AppExceptions = {
    validationFailed: (errors: Record<string, string[]>, message = "Validation failed") => {
        return new ValidationException(errors, message);
    },

    badRequest: (message: string, details?: Record<string, unknown>) => {
        return new BadRequestException(ErrorCode.BAD_REQUEST, message, details);
    },

    noPasswordSet: (message = "Cannot change password - account has no password set") => {
        return new BadRequestException(ErrorCode.BAD_REQUEST_NO_PASSWORD_SET, message);
    },

    passwordUnchanged: (message = "New password must be different from current password") => {
        return new BadRequestException(ErrorCode.BAD_REQUEST_PASSWORD_UNCHANGED, message);
    },

    sameAsCurrentEmail: (message = "New email is the same as current email") => {
        return new BadRequestException(ErrorCode.BAD_REQUEST_SAME_EMAIL, message);
    },

    sameAsCurrentPhone: (message = "New phone is the same as current phone") => {
        return new BadRequestException(ErrorCode.BAD_REQUEST_SAME_PHONE, message);
    },

    noPendingChange: (type: "email" | "phone") => {
        return new BadRequestException(
            ErrorCode.BAD_REQUEST_NO_PENDING_CHANGE,
            `No pending ${type} change request found or it has expired`,
            { type },
        );
    },

    notAuthenticated: (message = "Authentication required") => {
        return new AuthenticationException(ErrorCode.AUTH_REQUIRED, message);
    },

    invalidCredentials: (message = "Invalid credentials") => {
        return new AuthenticationException(ErrorCode.AUTH_INVALID_CREDENTIALS, message);
    },

    tokenMissing: (message = "Authentication token is required") => {
        return new AuthenticationException(ErrorCode.AUTH_TOKEN_MISSING, message);
    },

    tokenInvalid: (message = "Invalid authentication token") => {
        return new AuthenticationException(ErrorCode.AUTH_TOKEN_INVALID, message);
    },

    tokenExpired: (message = "Authentication token has expired") => {
        return new AuthenticationException(ErrorCode.AUTH_TOKEN_EXPIRED, message);
    },

    otpInvalid: (message = "Invalid verification code") => {
        return new AuthenticationException(ErrorCode.AUTH_OTP_INVALID, message);
    },

    otpExpired: (message = "Verification code has expired") => {
        return new AuthenticationException(ErrorCode.AUTH_OTP_EXPIRED, message);
    },

    otpLockedOut: (retryAfter: number) => {
        return new AuthenticationException(
            ErrorCode.AUTH_OTP_LOCKED_OUT,
            "Too many failed attempts. Please try again later",
            { retryAfter },
        );
    },

    accountLocked: (message = "Account is locked") => {
        return new AuthenticationException(ErrorCode.AUTH_ACCOUNT_LOCKED, message);
    },

    sessionExpired: (message = "Session has expired, please login again") => {
        return new AuthenticationException(ErrorCode.AUTH_SESSION_EXPIRED, message);
    },

    sessionInvalid: (message = "Invalid session") => {
        return new AuthenticationException(ErrorCode.AUTH_SESSION_INVALID, message);
    },

    loginLocked: (retryAfter: number) => {
        return new AuthenticationException(ErrorCode.AUTH_LOGIN_LOCKED, "Too many failed login attempts", {
            retryAfter,
        });
    },

    twoFactorRequired: (message = "Two-factor authentication required") => {
        return new AuthenticationException(ErrorCode.AUTH_2FA_REQUIRED, message);
    },

    transactionalTokenInvalid: (message = "Invalid or expired transactional token") => {
        return new AuthenticationException(ErrorCode.AUTH_TRANSACTIONAL_TOKEN_INVALID, message);
    },

    signupExpired: (message = "Signup session expired. Please start registration again") => {
        return new AuthenticationException(ErrorCode.AUTH_SIGNUP_EXPIRED, message);
    },

    reAuthRequired: (details: {
        windowSeconds: number;
        method: "PASSWORD" | "OTP";
        otpChannel?: "EMAIL" | "WHATSAPP";
    }) => {
        return new AuthorizationException(ErrorCode.FORBIDDEN_REAUTH_REQUIRED, "Re-authentication required", details);
    },

    forbidden: (message = "You do not have permission to perform this action") => {
        return new AuthorizationException(ErrorCode.FORBIDDEN_INSUFFICIENT_PERMISSION, message);
    },

    resourceForbidden: (resource: string, message?: string) => {
        return new AuthorizationException(
            ErrorCode.FORBIDDEN_RESOURCE_ACCESS,
            message ?? `You do not have access to this ${resource}`,
        );
    },

    notFound: (resource: string, identifier?: string | number) => {
        return new NotFoundException(resource, identifier);
    },

    conflict: (message: string, details?: Record<string, unknown>) => {
        return new ConflictException(message, ErrorCode.RESOURCE_CONFLICT, details);
    },

    alreadyExists: (resource: string, field?: string, value?: string) => {
        return new ConflictException(
            field ? `${resource} with this ${field} already exists` : `${resource} already exists`,
            ErrorCode.RESOURCE_ALREADY_EXISTS,
            field ? { field, ...(value !== undefined ? { value } : {}) } : undefined,
        );
    },

    deleted: (resource: string, identifier?: string | number) => {
        return new ConflictException(
            identifier ? `${resource} '${identifier}' has been deleted` : `${resource} has been deleted`,
            ErrorCode.RESOURCE_DELETED,
            { resource, identifier },
        );
    },

    deletionAlreadyRequested: (message = "Account deletion has already been requested") => {
        return new ConflictException(message, ErrorCode.CONFLICT_DELETION_PENDING);
    },

    rateLimitExceeded: (info?: RateLimitErrorDetail) => {
        return new RateLimitException(ErrorCode.RATE_LIMIT_EXCEEDED, "Too many requests", info);
    },

    otpRateLimitExceeded: (info?: RateLimitErrorDetail) => {
        return new RateLimitException(ErrorCode.RATE_OTP_LIMIT_EXCEEDED, "Too many verification code requests", info);
    },

    internal: (message = "An unexpected error occurred", cause?: Error) => {
        return new SystemException(ErrorCode.SYSTEM_INTERNAL_ERROR, message, cause);
    },

    database: (message = "A database error occurred", cause?: Error) => {
        return new SystemException(ErrorCode.SYSTEM_DATABASE_ERROR, message, cause);
    },

    externalService: (service: string, cause?: Error) => {
        return new SystemException(
            ErrorCode.SYSTEM_EXTERNAL_SERVICE_ERROR,
            `External service '${service}' is unavailable`,
            cause,
        );
    },

    maintenance: (message = "System is under maintenance") => {
        return new SystemException(ErrorCode.SYSTEM_MAINTENANCE, message);
    },
};
