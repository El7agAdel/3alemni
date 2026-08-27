import { Module } from "@nestjs/common";

import { UserModule } from "@modules/user/user.module";

import { AuditLogController } from "./controllers/audit-log.controller";
import { AuditLogService } from "./services/audit-log.service";

@Module({
    imports: [UserModule],
    controllers: [AuditLogController],
    providers: [AuditLogService],
})
export class AuditLogModule {}
