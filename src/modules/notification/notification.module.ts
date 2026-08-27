import { Module } from "@nestjs/common";

import { UserModule } from "@modules/user/user.module";
import { MessagingModule } from "@shared/messaging";

import { BroadcastController, DeviceTokenController, NotificationController } from "./controllers";
import { NotificationEventHandlers } from "./handlers";
import { BroadcastProcessor } from "./processors/broadcast.processor";
import { BroadcastProducer } from "./producers/broadcast.producer";
import { BroadcastRepository, DeviceTokenRepository, NotificationRepository } from "./repositories";
import {
    AudienceResolverService,
    BroadcastService,
    ChannelDispatcherService,
    DeviceTokenPublicService,
    DeviceTokenService,
    NotificationPublicService,
    NotificationService,
} from "./services";

@Module({
    imports: [UserModule, MessagingModule],
    controllers: [DeviceTokenController, NotificationController, BroadcastController],
    providers: [
        // Repositories
        DeviceTokenRepository,
        NotificationRepository,
        BroadcastRepository,

        // Services
        DeviceTokenService,
        ChannelDispatcherService,
        NotificationService,
        DeviceTokenPublicService,
        NotificationPublicService,
        BroadcastService,
        AudienceResolverService,

        // Producers
        BroadcastProducer,

        // Processors
        BroadcastProcessor,

        // Event handlers
        ...NotificationEventHandlers,
    ],
    exports: [DeviceTokenPublicService, NotificationPublicService],
})
export class NotificationModule {}
