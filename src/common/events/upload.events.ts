/**
 * Emitted when a file is deleted by hand from the admin endpoint.
 *
 * Only the deliberate deletion of a stored file: the cascades that follow an owner being
 * removed, and the orphan sweeper, run through `deleteByKey` and are not announced here -
 * they are already implied by the deletion of the thing that owned the file.
 */
export class UploadDeletedEvent {
    static readonly eventName = "upload.deleted" as const;

    constructor(
        public readonly uploadId: string,
        public readonly key: string,
        public readonly purpose: string,
        public readonly deletedBy: string,
        public readonly timestamp: Date = new Date(),
    ) {}
}
