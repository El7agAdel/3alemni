import { Injectable } from "@nestjs/common";

import { ConfigService } from "@config";

import { DeviceTokenService } from "./device-token.service";

@Injectable()
export class DeviceTokenPublicService {
    constructor(
        private readonly config: ConfigService,
        private readonly deviceTokenService: DeviceTokenService,
    ) {}

    /**
     * Clean up device tokens older than the configured retention window.
     * Used by the cleanup task.
     */
    async cleanStaleDeviceTokens(): Promise<number> {
        const days = this.config.notification.deviceToken.cleanupAfterDays;

        const { deleted } = await this.deviceTokenService.cleanupStaleTokens(days);

        return deleted;
    }
}
