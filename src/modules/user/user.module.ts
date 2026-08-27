import { Module } from "@nestjs/common";

import { RbacModule } from "@modules/rbac/rbac.module";
import { UploadModule } from "@modules/upload/upload.module";
import { MessagingModule } from "@shared/messaging";
import { OtpModule } from "@shared/otp";

import { MeController, UserController } from "./controllers";
import { UserEventHandlers } from "./handlers";
import { UserRepository } from "./repositories/user.repository";
import { MeService, UserPublicService, UserService } from "./services";

@Module({
    imports: [OtpModule, MessagingModule, RbacModule, UploadModule],
    controllers: [UserController, MeController],
    providers: [
        // Repositories
        UserRepository,

        // Services
        UserPublicService,
        UserService,
        MeService,

        // Event handlers
        ...UserEventHandlers,
    ],
    exports: [UserPublicService],
})
export class UserModule {}
