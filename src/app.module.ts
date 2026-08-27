import { Module } from "@nestjs/common";

import { CommonModule } from "@common/common.module";
import { ConfigModule } from "@config";
import { CacheModule } from "@infra/cache";
import { CommunicationModule } from "@infra/communication";
import { DatabaseModule } from "@infra/database";
import { EventsModule } from "@infra/events";
import { HealthModule } from "@infra/health";
import { LoggingModule } from "@infra/logging";
import { QueueModule } from "@infra/queue";
import { StorageModule } from "@infra/storage";
import { ThrottlerModule } from "@infra/throttler";
import { AuditLogModule } from "@modules/audit-log/audit-log.module";
import { AuthModule } from "@modules/auth/auth.module";
import { NotificationModule } from "@modules/notification/notification.module";
import { RbacModule } from "@modules/rbac/rbac.module";
import { UploadModule } from "@modules/upload/upload.module";
import { UserModule } from "@modules/user/user.module";
import { AuditModule } from "@shared/audit";
import { TasksModule } from "@tasks";

@Module({
    imports: [
        // Core
        ConfigModule,
        CommonModule,

        // Infrastructure
        LoggingModule,
        DatabaseModule,
        EventsModule,
        CacheModule,
        ThrottlerModule,
        QueueModule,
        CommunicationModule,
        StorageModule,
        HealthModule,

        // Scheduler
        TasksModule,

        // Shared
        AuditModule,

        // Features
        UserModule,
        RbacModule,
        UploadModule,
        AuthModule,
        AuditLogModule,
        NotificationModule,
    ],
})
export class AppModule {}
