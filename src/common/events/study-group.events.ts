/**
 * Emitted when the owner deletes a study group.
 */
export class StudyGroupDeletedEvent {
    static readonly eventName = "study_group.deleted" as const;

    constructor(
        public readonly studyGroupId: string,
        public readonly name: string,
        public readonly deletedBy: string,
        public readonly timestamp: Date = new Date(),
    ) {}
}

/**
 * Emitted when the owner approves a join request and the student is enrolled.
 */
export class JoinRequestApprovedEvent {
    static readonly eventName = "study_group.join_request.approved" as const;

    constructor(
        public readonly studyGroupId: string,
        public readonly requestId: string,
        public readonly studentId: string,
        public readonly enrollmentId: string,
        public readonly approvedBy: string,
        public readonly timestamp: Date = new Date(),
    ) {}
}

/**
 * Emitted when a student stops being a member of a study group,
 * either removed by the owner or leaving on their own.
 */
export class EnrollmentEndedEvent {
    static readonly eventName = "study_group.enrollment.ended" as const;

    constructor(
        public readonly studyGroupId: string,
        public readonly enrollmentId: string,
        public readonly studentId: string,
        public readonly reason: "REMOVED" | "LEFT",
        public readonly endedBy: string,
        public readonly timestamp: Date = new Date(),
    ) {}
}

/**
 * Emitted when the owner adds a teaching assistant to a study group.
 */
export class StudyGroupAssistantAddedEvent {
    static readonly eventName = "study_group.assistant.added" as const;

    constructor(
        public readonly studyGroupId: string,
        public readonly userId: string,
        public readonly addedBy: string,
        public readonly timestamp: Date = new Date(),
    ) {}
}

/**
 * Emitted when the owner removes a teaching assistant from a study group.
 */
export class StudyGroupAssistantRemovedEvent {
    static readonly eventName = "study_group.assistant.removed" as const;

    constructor(
        public readonly studyGroupId: string,
        public readonly userId: string,
        public readonly removedBy: string,
        public readonly timestamp: Date = new Date(),
    ) {}
}
