/**
 * Emitted when an admin creates and sends a broadcast.
 */
export class BroadcastSentEvent {
    static readonly eventName = "notification.broadcast.sent" as const;

    constructor(
        public readonly broadcastId: string,
        public readonly createdBy: string,
        public readonly audience: string,
        public readonly audienceSize: number,
        public readonly channel: string,
        public readonly persistAsNotification: boolean,
        public readonly timestamp: Date = new Date(),
    ) {}
}
