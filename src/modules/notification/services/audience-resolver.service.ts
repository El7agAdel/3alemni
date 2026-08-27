import { Injectable } from "@nestjs/common";

import { ConfigService } from "@config";
import { LoggingService } from "@infra/logging";
import { UserPublicService } from "@modules/user";

import { AudienceParams, BroadcastAudience } from "../constants";

@Injectable()
export class AudienceResolverService {
    constructor(
        private readonly config: ConfigService,
        private readonly logger: LoggingService,
        private readonly userPublic: UserPublicService,
    ) {
        this.logger.setContext(AudienceResolverService.name);
    }

    /**
     * Resolve an audience to the list of user IDs that should receive the broadcast.
     */
    async resolve(audience: BroadcastAudience, actorId: string, params?: AudienceParams): Promise<string[]> {
        switch (audience) {
            case BroadcastAudience.ME:
                return [actorId];
            case BroadcastAudience.ALL_USERS:
                return this.userPublic.listActiveUserIds();
            case BroadcastAudience.NEW_USERS:
                return this.userPublic.listUserIdsCreatedAfter(this.newUserWindowStart());
            case BroadcastAudience.NEWSLETTER_SUBSCRIBERS:
                return this.userPublic.listNewsletterSubscriberIds();
            case BroadcastAudience.USER_IDS:
                return params?.userIds ?? [];
            case BroadcastAudience.ROLES:
                return this.userPublic.listUserIdsByRoleIds(params?.roleIds ?? []);
            default:
                throw new Error(`Unhandled audience: ${String(audience)}`);
        }
    }

    /**
     * Resolve an audience size without fetching the user IDs.
     * Used by the preview endpoint and pre-send validation.
     */
    async count(audience: BroadcastAudience, _actorId: string, params?: AudienceParams): Promise<number> {
        switch (audience) {
            case BroadcastAudience.ME:
                return 1;
            case BroadcastAudience.ALL_USERS:
                return this.userPublic.countActiveUsers();
            case BroadcastAudience.NEW_USERS:
                return this.userPublic.countUsersCreatedAfter(this.newUserWindowStart());
            case BroadcastAudience.NEWSLETTER_SUBSCRIBERS:
                return this.userPublic.countNewsletterSubscribers();
            case BroadcastAudience.USER_IDS:
                return (params?.userIds ?? []).length;
            case BroadcastAudience.ROLES:
                return (await this.userPublic.listUserIdsByRoleIds(params?.roleIds ?? [])).length;
            default:
                throw new Error(`Unhandled audience: ${String(audience)}`);
        }
    }

    /**
     * Start of the "new users" window, based on the configured number of days.
     */
    private newUserWindowStart(): Date {
        const days = this.config.notification.broadcast.newUserWindowDays;

        return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    }
}
