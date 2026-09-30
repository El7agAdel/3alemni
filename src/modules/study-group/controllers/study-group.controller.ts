import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    ParseUUIDPipe,
    Patch,
    Post,
    Query,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { CurrentUser, ResponseMessage, Serialize } from "@common/decorators";
import { type AuthenticatedUser } from "@common/interfaces";
import { ApiEndpoint, ApiPaginatedResponse, ApiSuccessResponse } from "@infra/swagger";
import { Permissions, RequirePermission } from "@modules/rbac";

import { AllStudyGroupsQueryDto, CreateStudyGroupDto, StudyGroupQueryDto, UpdateStudyGroupDto } from "../dto/requests";
import { JoinCodeDto, StudyGroupDto } from "../dto/responses";
import { StudyGroupService } from "../services";

@ApiTags("Study Groups")
@ApiBearerAuth()
@Controller("study-groups")
export class StudyGroupController {
    constructor(private readonly studyGroupService: StudyGroupService) {}

    @Post()
    @RequirePermission(Permissions.StudyGroup.CREATE)
    @Serialize(StudyGroupDto)
    @ApiEndpoint({
        summary: "Create a study group",
        description: "The caller becomes the owner. A join code is generated for students",
        permission: Permissions.StudyGroup.CREATE.key,
    })
    @ApiSuccessResponse({ description: "Study group created successfully", type: StudyGroupDto, isCreated: true })
    @ResponseMessage("Study group created successfully")
    create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateStudyGroupDto) {
        return this.studyGroupService.create(user, dto);
    }

    @Get()
    @RequirePermission(Permissions.StudyGroup.READ)
    @Serialize(StudyGroupDto)
    @ApiEndpoint({
        summary: "List my study groups",
        description: "Groups I own, assist, or study in. Admins list every group with GET /study-groups/all",
        permission: Permissions.StudyGroup.READ.key,
    })
    @ApiPaginatedResponse({ description: "Study groups retrieved successfully", type: [StudyGroupDto] })
    @ResponseMessage("Study groups retrieved successfully")
    list(@CurrentUser() user: AuthenticatedUser, @Query() query: StudyGroupQueryDto) {
        return this.studyGroupService.list(user, query);
    }

    // Declared before ":id", so "all" is not read as a group id
    @Get("all")
    @RequirePermission(Permissions.StudyGroup.READ_ALL)
    @Serialize(StudyGroupDto)
    @ApiEndpoint({
        summary: "List every study group",
        description:
            "For the platform admins who oversee the app. Teachers, assistants and students use GET /study-groups",
        permission: Permissions.StudyGroup.READ_ALL.key,
    })
    @ApiPaginatedResponse({ description: "Study groups retrieved successfully", type: [StudyGroupDto] })
    @ResponseMessage("Study groups retrieved successfully")
    listAll(@CurrentUser() user: AuthenticatedUser, @Query() query: AllStudyGroupsQueryDto) {
        return this.studyGroupService.listAll(user, query);
    }

    @Get(":id")
    @RequirePermission(Permissions.StudyGroup.READ)
    @Serialize(StudyGroupDto)
    @ApiEndpoint({ summary: "Get a study group I belong to", permission: Permissions.StudyGroup.READ.key })
    @ApiSuccessResponse({ description: "Study group retrieved successfully", type: StudyGroupDto })
    @ResponseMessage("Study group retrieved successfully")
    findOne(@CurrentUser() user: AuthenticatedUser, @Param("id", ParseUUIDPipe) id: string) {
        return this.studyGroupService.findOne(user, id);
    }

    @Patch(":id")
    @RequirePermission(Permissions.StudyGroup.UPDATE)
    @Serialize(StudyGroupDto)
    @ApiEndpoint({
        summary: "Update a study group",
        description: "Owner only. Setting status to ARCHIVED makes the group read-only",
        permission: Permissions.StudyGroup.UPDATE.key,
    })
    @ApiSuccessResponse({ description: "Study group updated successfully", type: StudyGroupDto })
    @ResponseMessage("Study group updated successfully")
    update(
        @CurrentUser() user: AuthenticatedUser,
        @Param("id", ParseUUIDPipe) id: string,
        @Body() dto: UpdateStudyGroupDto,
    ) {
        return this.studyGroupService.update(user, id, dto);
    }

    @Delete(":id")
    @RequirePermission(Permissions.StudyGroup.DELETE)
    @ApiEndpoint({
        summary: "Delete a study group",
        description: "Owner only. Blocked while the group has active students: archive it instead",
        permission: Permissions.StudyGroup.DELETE.key,
    })
    @ApiSuccessResponse({ description: "Study group deleted successfully" })
    @ResponseMessage("Study group deleted successfully")
    async delete(@CurrentUser() user: AuthenticatedUser, @Param("id", ParseUUIDPipe) id: string) {
        await this.studyGroupService.delete(user, id);
    }

    @Get(":id/join-code")
    @RequirePermission(Permissions.StudyGroup.UPDATE)
    @Serialize(JoinCodeDto)
    @ApiEndpoint({
        summary: "Get the join code",
        description: "Owner only",
        permission: Permissions.StudyGroup.UPDATE.key,
    })
    @ApiSuccessResponse({ description: "Join code retrieved successfully", type: JoinCodeDto })
    @ResponseMessage("Join code retrieved successfully")
    getJoinCode(@CurrentUser() user: AuthenticatedUser, @Param("id", ParseUUIDPipe) id: string) {
        return this.studyGroupService.getJoinCode(user, id);
    }

    @Post(":id/join-code/reset")
    @HttpCode(HttpStatus.OK)
    @RequirePermission(Permissions.StudyGroup.UPDATE)
    @Serialize(JoinCodeDto)
    @ApiEndpoint({
        summary: "Reset the join code",
        description: "Owner only. The old code stops working; requests already sent are kept",
        permission: Permissions.StudyGroup.UPDATE.key,
    })
    @ApiSuccessResponse({ description: "Join code reset successfully", type: JoinCodeDto })
    @ResponseMessage("Join code reset successfully")
    resetJoinCode(@CurrentUser() user: AuthenticatedUser, @Param("id", ParseUUIDPipe) id: string) {
        return this.studyGroupService.resetJoinCode(user, id);
    }
}
