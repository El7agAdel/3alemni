import { Module } from "@nestjs/common";

import { MessagingModule } from "@shared/messaging";

import { OtpRepository } from "./otp.repository";
import { OtpService } from "./otp.service";

@Module({
    imports: [MessagingModule],
    providers: [OtpRepository, OtpService],
    exports: [OtpService],
})
export class OtpModule {}
