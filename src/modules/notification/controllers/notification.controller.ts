import { Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { CurrentUser, ResponseMessage, Serialize } from "@common/decorators";
import { type AuthenticatedUser } from "@common/interfaces";
import { ApiEndpoint, ApiPaginatedResponse, ApiSuccessResponse } from "@infra/swagger";

import { NotificationQueryDto } from "../dto/requests";
import { MarkAllReadDto, NotificationDto, NotificationListDto, UnreadCountDto } from "../dto/responses";
import { NotificationService } from "../services";

@ApiTags("Notifications")
@ApiBearerAuth()
@Controller("me/notifications")
export class NotificationController {
    constructor(private readonly notificationService: NotificationService) {}

    @Get()
    @Serialize(NotificationListDto)
    @ApiEndpoint({
        summary: "List my notifications",
        description: "Get a list of the current user's notifications. Can be filtered by read/unread",
    })
    @ApiPaginatedResponse({
        description: "Notifications retrieved successfully",
        type: [NotificationListDto],
    })
    @ResponseMessage("Notifications retrieved successfully")
    async list(@CurrentUser() user: AuthenticatedUser, @Query() query: NotificationQueryDto) {
        return this.notificationService.listForUser(user.id, query);
    }

    @Get("unread-count")
    @Serialize(UnreadCountDto)
    @ApiEndpoint({ summary: "Count my unread notifications" })
    @ApiSuccessResponse({
        description: "Unread count retrieved successfully",
        type: UnreadCountDto,
    })
    @ResponseMessage("Unread count retrieved successfully")
    async unreadCount(@CurrentUser() user: AuthenticatedUser) {
        const count = await this.notificationService.countUnreadForUser(user.id);

        return { count };
    }

    @Get(":id")
    @Serialize(NotificationDto)
    @ApiEndpoint({ summary: "Get my notification by ID" })
    @ApiSuccessResponse({
        description: "Notification retrieved successfully",
        type: NotificationDto,
    })
    @ResponseMessage("Notification retrieved successfully")
    async findOne(@CurrentUser() user: AuthenticatedUser, @Param("id", ParseUUIDPipe) id: string) {
        return this.notificationService.findByIdForUser(user.id, id);
    }

    @Post(":id/read")
    @HttpCode(HttpStatus.OK)
    @Serialize(NotificationDto)
    @ApiEndpoint({ summary: "Mark my notification as read" })
    @ApiSuccessResponse({
        description: "Notification marked as read",
        type: NotificationDto,
    })
    @ResponseMessage("Notification marked as read")
    async markRead(@CurrentUser() user: AuthenticatedUser, @Param("id", ParseUUIDPipe) id: string) {
        return this.notificationService.markRead(user.id, id);
    }

    @Post("read-all")
    @HttpCode(HttpStatus.OK)
    @Serialize(MarkAllReadDto)
    @ApiEndpoint({ summary: "Mark all my notifications as read" })
    @ApiSuccessResponse({
        description: "All notifications marked as read",
        type: MarkAllReadDto,
    })
    @ResponseMessage("All notifications marked as read")
    async markAllRead(@CurrentUser() user: AuthenticatedUser) {
        return this.notificationService.markAllRead(user.id);
    }
}
