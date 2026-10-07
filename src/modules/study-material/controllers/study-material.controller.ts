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

import { CreateStudyMaterialDto, StudyMaterialQueryDto, UpdateStudyMaterialDto } from "../dto/requests";
import { StudyMaterialDto } from "../dto/responses";
import { StudyMaterialService } from "../services";

@ApiTags("Study Materials")
@ApiBearerAuth()
@Controller("study-groups/:groupId/materials")
export class StudyMaterialController {
    constructor(private readonly studyMaterialService: StudyMaterialService) {}

    @Post()
    @RequirePermission(Permissions.StudyMaterial.CREATE)
    @Serialize(StudyMaterialDto)
    @ApiEndpoint({
        summary: "Add study material",
        description: "Owner and assistants. New material is a draft until it is published",
        permission: Permissions.StudyMaterial.CREATE.key,
    })
    @ApiSuccessResponse({ description: "Study material created successfully", type: StudyMaterialDto, isCreated: true })
    @ResponseMessage("Study material created successfully")
    create(
        @CurrentUser() user: AuthenticatedUser,
        @Param("groupId", ParseUUIDPipe) groupId: string,
        @Body() dto: CreateStudyMaterialDto,
    ) {
        return this.studyMaterialService.create(user, groupId, dto);
    }

    @Get()
    @RequirePermission(Permissions.StudyMaterial.READ)
    @Serialize(StudyMaterialDto)
    @ApiEndpoint({
        summary: "List the group's study material",
        description: "Members. Students only get published material",
        permission: Permissions.StudyMaterial.READ.key,
    })
    @ApiPaginatedResponse({ description: "Study material retrieved successfully", type: [StudyMaterialDto] })
    @ResponseMessage("Study material retrieved successfully")
    list(
        @CurrentUser() user: AuthenticatedUser,
        @Param("groupId", ParseUUIDPipe) groupId: string,
        @Query() query: StudyMaterialQueryDto,
    ) {
        return this.studyMaterialService.list(user, groupId, query);
    }

    @Get(":id")
    @RequirePermission(Permissions.StudyMaterial.READ)
    @Serialize(StudyMaterialDto)
    @ApiEndpoint({
        summary: "Get study material",
        description: "Members. A draft is 404 for students",
        permission: Permissions.StudyMaterial.READ.key,
    })
    @ApiSuccessResponse({ description: "Study material retrieved successfully", type: StudyMaterialDto })
    @ResponseMessage("Study material retrieved successfully")
    findOne(
        @CurrentUser() user: AuthenticatedUser,
        @Param("groupId", ParseUUIDPipe) groupId: string,
        @Param("id", ParseUUIDPipe) id: string,
    ) {
        return this.studyMaterialService.findOne(user, groupId, id);
    }

    @Patch(":id")
    @RequirePermission(Permissions.StudyMaterial.UPDATE)
    @Serialize(StudyMaterialDto)
    @ApiEndpoint({
        summary: "Update study material",
        description: "Owner and assistants. Sending attachments replaces the whole list",
        permission: Permissions.StudyMaterial.UPDATE.key,
    })
    @ApiSuccessResponse({ description: "Study material updated successfully", type: StudyMaterialDto })
    @ResponseMessage("Study material updated successfully")
    update(
        @CurrentUser() user: AuthenticatedUser,
        @Param("groupId", ParseUUIDPipe) groupId: string,
        @Param("id", ParseUUIDPipe) id: string,
        @Body() dto: UpdateStudyMaterialDto,
    ) {
        return this.studyMaterialService.update(user, groupId, id, dto);
    }

    @Post(":id/publish")
    @HttpCode(HttpStatus.OK)
    @RequirePermission(Permissions.StudyMaterial.UPDATE)
    @Serialize(StudyMaterialDto)
    @ApiEndpoint({
        summary: "Publish study material",
        description: "Owner and assistants. Students of the group can see it from now on",
        permission: Permissions.StudyMaterial.UPDATE.key,
    })
    @ApiSuccessResponse({ description: "Study material published successfully", type: StudyMaterialDto })
    @ResponseMessage("Study material published successfully")
    publish(
        @CurrentUser() user: AuthenticatedUser,
        @Param("groupId", ParseUUIDPipe) groupId: string,
        @Param("id", ParseUUIDPipe) id: string,
    ) {
        return this.studyMaterialService.publish(user, groupId, id);
    }

    @Post(":id/unpublish")
    @HttpCode(HttpStatus.OK)
    @RequirePermission(Permissions.StudyMaterial.UPDATE)
    @Serialize(StudyMaterialDto)
    @ApiEndpoint({
        summary: "Unpublish study material",
        description: "Owner and assistants. Hides it from students again",
        permission: Permissions.StudyMaterial.UPDATE.key,
    })
    @ApiSuccessResponse({ description: "Study material unpublished successfully", type: StudyMaterialDto })
    @ResponseMessage("Study material unpublished successfully")
    unpublish(
        @CurrentUser() user: AuthenticatedUser,
        @Param("groupId", ParseUUIDPipe) groupId: string,
        @Param("id", ParseUUIDPipe) id: string,
    ) {
        return this.studyMaterialService.unpublish(user, groupId, id);
    }

    @Delete(":id")
    @RequirePermission(Permissions.StudyMaterial.DELETE)
    @ApiEndpoint({
        summary: "Delete study material",
        description: "Owner and assistants. Its files are deleted too",
        permission: Permissions.StudyMaterial.DELETE.key,
    })
    @ApiSuccessResponse({ description: "Study material deleted successfully" })
    @ResponseMessage("Study material deleted successfully")
    async delete(
        @CurrentUser() user: AuthenticatedUser,
        @Param("groupId", ParseUUIDPipe) groupId: string,
        @Param("id", ParseUUIDPipe) id: string,
    ) {
        await this.studyMaterialService.delete(user, groupId, id);
    }
}
