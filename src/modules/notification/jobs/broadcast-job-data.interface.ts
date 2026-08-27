import { BaseJobData } from "@infra/queue";

export interface DispatchBroadcastJobData extends BaseJobData {
    broadcastId: string;
}
