import { Global, Module } from "@nestjs/common";

import { EmailProvider, FcmProvider, WhatsAppProvider } from "./providers";

@Global()
@Module({
    providers: [EmailProvider, WhatsAppProvider, FcmProvider],
    exports: [EmailProvider, WhatsAppProvider, FcmProvider],
})
export class CommunicationModule {}
