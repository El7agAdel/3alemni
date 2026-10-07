import { Module } from "@nestjs/common";

import { StudyGroupModule } from "@modules/study-group/study-group.module";
import { UploadModule } from "@modules/upload/upload.module";

import { StudyMaterialController } from "./controllers";
import { StudyMaterialEventHandlers } from "./handlers";
import { StudyMaterialRepository } from "./repositories";
import { StudyMaterialService } from "./services";

@Module({
    imports: [StudyGroupModule, UploadModule],
    controllers: [StudyMaterialController],
    providers: [
        // Repositories
        StudyMaterialRepository,

        // Services
        StudyMaterialService,

        // Event handlers
        ...StudyMaterialEventHandlers,
    ],
})
export class StudyMaterialModule {}
