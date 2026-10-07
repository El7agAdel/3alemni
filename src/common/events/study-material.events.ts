/**
 * Emitted when the staff of a group delete a piece of study material.
 */
export class StudyMaterialDeletedEvent {
    static readonly eventName = "study_material.deleted" as const;

    constructor(
        public readonly studyGroupId: string,
        public readonly studyMaterialId: string,
        public readonly name: string,
        public readonly deletedBy: string,
        public readonly timestamp: Date = new Date(),
    ) {}
}
