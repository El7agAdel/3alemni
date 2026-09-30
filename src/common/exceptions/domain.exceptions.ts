import { HttpStatus } from "@nestjs/common";

import { ErrorCode, type ErrorCodeType } from "../constants";

import { BusinessException } from "./domain.exception";

/**
 * Factory for domain and business exceptions.
 * Uses the base domain class to generate custom exceptions.
 */
export const DomainExceptions = {
    business: (
        code: ErrorCodeType,
        message: string,
        details?: Record<string, unknown>,
        statusCode: HttpStatus = HttpStatus.UNPROCESSABLE_ENTITY,
    ) => {
        return new BusinessException(code, message, details, statusCode);
    },

    systemUserProtected: () => {
        return new BusinessException(ErrorCode.RBAC_SYSTEM_USER_PROTECTED, "Cannot modify a user with system role");
    },

    systemRoleImmutable: () => {
        return new BusinessException(ErrorCode.RBAC_SYSTEM_ROLE_IMMUTABLE, "System roles cannot be modified");
    },

    privilegeEscalation: (attemptedPermissions: string[]) => {
        return new BusinessException(ErrorCode.RBAC_PRIVILEGE_ESCALATION, "Cannot grant permissions you don't have", {
            permissions: attemptedPermissions,
        });
    },

    cannotSelfElevate: () => {
        return new BusinessException(ErrorCode.RBAC_CANNOT_SELF_ELEVATE, "Cannot assign roles to yourself");
    },

    roleInUse: (usersCount: number) => {
        return new BusinessException(ErrorCode.RBAC_ROLE_IN_USE, "Cannot delete role in use.", { usersCount });
    },

    resourceInUse: (resource: string, name: string, blockedBy: string, count: number, reason: string) => {
        return new BusinessException(ErrorCode.RESOURCE_IN_USE, `Cannot delete ${resource} "${name}": ${reason}`, {
            resource,
            name,
            blockedBy,
            count,
        });
    },

    audienceEmpty: () => {
        return new BusinessException(
            ErrorCode.NOTIFICATION_AUDIENCE_EMPTY,
            "Broadcast audience resolved to zero recipients",
        );
    },

    audienceTooLarge: (size: number, maxAudienceSize: number) => {
        return new BusinessException(
            ErrorCode.NOTIFICATION_AUDIENCE_TOO_LARGE,
            `Broadcast audience (${size}) exceeds the maximum of ${maxAudienceSize} recipients`,
            { size, maxAudienceSize },
        );
    },

    studyGroupNotJoinable: (status: string) => {
        return new BusinessException(
            ErrorCode.STUDY_GROUP_NOT_JOINABLE,
            "This study group is not accepting new students",
            { status },
        );
    },

    studyGroupAlreadyMember: (role: string) => {
        return new BusinessException(
            ErrorCode.STUDY_GROUP_ALREADY_MEMBER,
            "The user is already a member of this study group",
            { role },
            HttpStatus.CONFLICT,
        );
    },

    studyGroupNotAssistant: () => {
        return new BusinessException(
            ErrorCode.STUDY_GROUP_NOT_ASSISTANT,
            "The user is not allowed to be a teaching assistant",
        );
    },

    requestAlreadyExists: (status: string) => {
        return new BusinessException(
            ErrorCode.REQUEST_ALREADY_EXISTS,
            "You already have an open request",
            { status },
            HttpStatus.CONFLICT,
        );
    },

    requestWrongStatus: (action: string, status: string) => {
        return new BusinessException(
            ErrorCode.REQUEST_WRONG_STATUS,
            `A ${status.toLowerCase()} request cannot be ${action}`,
            { action, status },
        );
    },
};
