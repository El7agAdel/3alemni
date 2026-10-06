import { SortableFields } from "@common/interfaces";
import { EnrollmentStatus } from "@generated/enums";

/**
 * How a user is linked to a study group. Not stored: it is worked out on every request.
 * System-role users count as OWNER in every group.
 */
export const GroupRole = {
    OWNER: "OWNER",
    ASSISTANT: "ASSISTANT",
    STUDENT: "STUDENT",
} as const;

export type GroupRole = (typeof GroupRole)[keyof typeof GroupRole];

/**
 * What makes an enrollment count as "a student of the group". Use it in every query
 * that asks who the students are, so paused and withdrawn rows never leak in.
 */
export const ACTIVE_ENROLLMENT = {
    status: EnrollmentStatus.ACTIVE,
    deletedAt: null,
} as const;

export const JOIN_CODE_LENGTH = 8;

/**
 * Attempts at generating a join code that is not taken yet.
 */
export const JOIN_CODE_MAX_ATTEMPTS = 5;

/**
 * The user fields shown next to a group, a request, a student, or an assistant.
 */
export const USER_SUMMARY_SELECT = {
    id: true,
    username: true,
    displayName: true,
    firstName: true,
    lastName: true,
    avatar: true,
} as const;

export const StudyGroupQuery = {
    sort: {
        allowed: {
            name: "name",
            status: "status",
            createdAt: "createdAt",
            updatedAt: "updatedAt",
        },
        defaultField: "createdAt",
        defaultOrder: "desc",
    } as SortableFields,

    search: ["name", "subject"],
};

export const JoinRequestQuery = {
    sort: {
        allowed: { createdAt: "createdAt", updatedAt: "updatedAt" },
        defaultField: "createdAt",
        defaultOrder: "desc",
    } as SortableFields,
};

export const GroupStudentQuery = {
    sort: {
        allowed: { joinedAt: "joinedAt", createdAt: "createdAt" },
        defaultField: "joinedAt",
        defaultOrder: "asc",
    } as SortableFields,

    // Searched through the student relation, see GroupMemberService
    search: ["username", "displayName", "firstName", "lastName"],
};
