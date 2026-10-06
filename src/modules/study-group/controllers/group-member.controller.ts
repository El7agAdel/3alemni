import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { CurrentUser, ResponseMessage, Serialize } from "@common/decorators";
import { type AuthenticatedUser } from "@common/interfaces";
import { ApiEndpoint, ApiPaginatedResponse, ApiSuccessResponse } from "@infra/swagger";
import { Permissions, RequirePermission } from "@modules/rbac";

import { AddAssistantDto, GroupStudentQueryDto } from "../dto/requests";
import { GroupAssistantDto, GroupStudentDto } from "../dto/responses";
import { GroupMemberService } from "../services";

@ApiTags("Study Groups - Members")
@ApiBearerAuth()
@Controller("study-groups/:groupId")
export class GroupMemberController {
    constructor(private readonly groupMemberService: GroupMemberService) {}

    @Get("assistants")
    @RequirePermission(Permissions.StudyGroup.READ)
    @Serialize(GroupAssistantDto)
    @ApiEndpoint({
        summary: "List the group's assistants",
        description: "Owner and assistants",
        permission: Permissions.StudyGroup.READ.key,
    })
    @ApiSuccessResponse({ description: "Assistants retrieved successfully", type: [GroupAssistantDto] })
    @ResponseMessage("Assistants retrieved successfully")
    listAssistants(@CurrentUser() user: AuthenticatedUser, @Param("groupId", ParseUUIDPipe) groupId: string) {
        return this.groupMemberService.listAssistants(user, groupId);
    }

    @Post("assistants")
    @RequirePermission(Permissions.StudyGroup.UPDATE)
    @Serialize(GroupAssistantDto)
    @ApiEndpoint({
        summary: "Add an assistant",
        description: "Owner only. The user needs the Teaching Assistant role (study-group:assist)",
        permission: Permissions.StudyGroup.UPDATE.key,
    })
    @ApiSuccessResponse({ description: "Assistant added successfully", type: GroupAssistantDto, isCreated: true })
    @ResponseMessage("Assistant added successfully")
    addAssistant(
        @CurrentUser() user: AuthenticatedUser,
        @Param("groupId", ParseUUIDPipe) groupId: string,
        @Body() dto: AddAssistantDto,
    ) {
        return this.groupMemberService.addAssistant(user, groupId, dto);
    }

    @Delete("assistants/:userId")
    @RequirePermission(Permissions.StudyGroup.UPDATE)
    @ApiEndpoint({
        summary: "Remove an assistant",
        description: "Owner only",
        permission: Permissions.StudyGroup.UPDATE.key,
    })
    @ApiSuccessResponse({ description: "Assistant removed successfully" })
    @ResponseMessage("Assistant removed successfully")
    async removeAssistant(
        @CurrentUser() user: AuthenticatedUser,
        @Param("groupId", ParseUUIDPipe) groupId: string,
        @Param("userId", ParseUUIDPipe) userId: string,
    ) {
        await this.groupMemberService.removeAssistant(user, groupId, userId);
    }

    @Get("students")
    @RequirePermission(Permissions.Enrollment.READ)
    @Serialize(GroupStudentDto)
    @ApiEndpoint({
        summary: "List the group's students",
        description: "Owner and assistants. Shows ACTIVE students unless a status is given",
        permission: Permissions.Enrollment.READ.key,
    })
    @ApiPaginatedResponse({ description: "Students retrieved successfully", type: [GroupStudentDto] })
    @ResponseMessage("Students retrieved successfully")
    listStudents(
        @CurrentUser() user: AuthenticatedUser,
        @Param("groupId", ParseUUIDPipe) groupId: string,
        @Query() query: GroupStudentQueryDto,
    ) {
        return this.groupMemberService.listStudents(user, groupId, query);
    }

    @Delete("students/:studentId")
    @RequirePermission(Permissions.Enrollment.DELETE)
    @ApiEndpoint({
        summary: "Remove a student",
        description: "Owner only. The enrollment becomes WITHDRAWN",
        permission: Permissions.Enrollment.DELETE.key,
    })
    @ApiSuccessResponse({ description: "Student removed successfully" })
    @ResponseMessage("Student removed successfully")
    async removeStudent(
        @CurrentUser() user: AuthenticatedUser,
        @Param("groupId", ParseUUIDPipe) groupId: string,
        @Param("studentId", ParseUUIDPipe) studentId: string,
    ) {
        await this.groupMemberService.removeStudent(user, groupId, studentId);
    }
}
