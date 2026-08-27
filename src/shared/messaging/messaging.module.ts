import { Module } from "@nestjs/common";

import { EmailFactory, EmailProcessor, EmailProducer, EmailRendererService, EmailService } from "./email";
import { PushProcessor, PushProducer, PushService } from "./push";
import { WhatsAppFactory, WhatsAppProcessor, WhatsAppProducer, WhatsAppService } from "./whatsapp";

@Module({
    providers: [
        // Email
        EmailService,
        EmailRendererService,
        EmailFactory,
        EmailProducer,
        EmailProcessor,

        // WhatsApp
        WhatsAppService,
        WhatsAppFactory,
        WhatsAppProducer,
        WhatsAppProcessor,

        // Push
        PushService,
        PushProducer,
        PushProcessor,
    ],
    exports: [EmailService, WhatsAppService, PushService],
})
export class MessagingModule {}
