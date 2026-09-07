import { Module, OnModuleInit } from "@nestjs/common";

import { UploadUtil } from "@common/utils";
import { ConfigService } from "@config";

import { UploadController } from "./controllers/upload.controller";
import { UploadEventHandlers } from "./handlers";
import { UploadRepository } from "./repositories/upload.repository";
import { UploadPublicService, UploadService } from "./services";

@Module({
    controllers: [UploadController],
    providers: [UploadRepository, UploadService, UploadPublicService, ...UploadEventHandlers],
    exports: [UploadPublicService],
})
export class UploadModule implements OnModuleInit {
    constructor(private readonly config: ConfigService) {}

    onModuleInit() {
        UploadUtil.initialize(this.config.storage);
    }
}
