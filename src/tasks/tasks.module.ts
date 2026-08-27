import { Module } from "@nestjs/common";

import { NotificationModule } from "@modules/notification/notification.module";
import { UploadModule } from "@modules/upload/upload.module";
import { OtpModule } from "@shared/otp";

import { CleanupProcessor, CleanupProducer, CleanupService } from "./cleanup";
import { TasksService } from "./tasks.service";

@Module({
    imports: [OtpModule, UploadModule, NotificationModule],
    providers: [
        // Cleanup
        CleanupService,
        CleanupProducer,
        CleanupProcessor,

        // Core
        TasksService,
    ],
})
export class TasksModule {}
