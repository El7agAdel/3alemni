import { Module } from "@nestjs/common";

import { RbacModule } from "@modules/rbac/rbac.module";
import { UserModule } from "@modules/user/user.module";

import {
    GroupMemberController,
    JoinController,
    JoinRequestController,
    MyJoinRequestController,
    StudyGroupController,
} from "./controllers";
import { StudyGroupEventHandlers } from "./handlers";
import { AssistantRepository, EnrollmentRepository, JoinRequestRepository, StudyGroupRepository } from "./repositories";
import { GroupMemberService, JoinRequestService, StudyGroupPublicService, StudyGroupService } from "./services";

@Module({
    imports: [UserModule, RbacModule],
    controllers: [
        // First, so "study-groups/join/:code" is matched before any "study-groups/:groupId/..." route
        JoinController,
        StudyGroupController,
        GroupMemberController,
        JoinRequestController,
        MyJoinRequestController,
    ],
    providers: [
        // Repositories
        StudyGroupRepository,
        EnrollmentRepository,
        AssistantRepository,
        JoinRequestRepository,

        // Services
        StudyGroupPublicService,
        StudyGroupService,
        GroupMemberService,
        JoinRequestService,

        // Event handlers
        ...StudyGroupEventHandlers,
    ],
    exports: [StudyGroupPublicService],
})
export class StudyGroupModule {}
