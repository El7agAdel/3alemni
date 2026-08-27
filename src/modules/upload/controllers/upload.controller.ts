import { Body, Controller, Delete, Get, Param, Post, Query, UploadedFile, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";

import { CurrentUser, ResponseMessage, Serialize } from "@common/decorators";
import { AppExceptions } from "@common/exceptions";
import { type AuthenticatedUser } from "@common/interfaces";
import { ApiEndpoint, ApiPaginatedResponse, ApiSuccessResponse } from "@infra/swagger";
import { Permissions, RequirePermission } from "@modules/rbac";
import { AuditActions, AuditService } from "@shared/audit";

import { UPLOAD_PURPOSE_CONFIG } from "../constants";
import { UploadFileDto, UploadQueryDto } from "../dto/requests";
import { UploadDto } from "../dto/responses";
import { UploadService } from "../services";

@ApiTags("Uploads")
@ApiBearerAuth()
@Controller("uploads")
export class UploadController {
    constructor(
        private readonly uploadService: UploadService,
        private readonly auditService: AuditService,
    ) {}

    @Get("purposes")
    @ApiEndpoint({
        summary: "List upload purposes",
        description: "What file types and sizes are allowed per purpose",
    })
    @ApiSuccessResponse({ description: "Upload purposes retrieved successfully" })
    @ResponseMessage("Upload purposes retrieved successfully")
    listPurposes() {
        const purposes: Record<string, object> = {};

        for (const [key, config] of Object.entries(UPLOAD_PURPOSE_CONFIG)) {
            purposes[key] = {
                allowedMimeTypes: config.allowedMimeTypes,
                maxSizeBytes: config.maxSizeBytes,
            };
        }

        return purposes;
    }

    @Get()
    @RequirePermission(Permissions.Upload.READ)
    @Serialize(UploadDto)
    @ApiEndpoint({
        summary: "List all uploads",
        permission: Permissions.Upload.READ.key,
    })
    @ApiPaginatedResponse({
        description: "Uploads retrieved successfully",
        type: [UploadDto],
    })
    @ResponseMessage("Uploads retrieved successfully")
    listUploads(@Query() query: UploadQueryDto) {
        return this.uploadService.list(query);
    }

    @Get(":id")
    @RequirePermission(Permissions.Upload.READ)
    @Serialize(UploadDto)
    @ApiEndpoint({
        summary: "Get uploaded file by ID",
        permission: Permissions.Upload.READ.key,
    })
    @ApiSuccessResponse({
        description: "Upload retrieved successfully",
        type: UploadDto,
    })
    @ResponseMessage("Upload retrieved successfully")
    getUpload(@Param("id") id: string) {
        return this.uploadService.findByIdOrFail(id);
    }

    @Post()
    @Throttle({ default: { ttl: 60000, limit: 10 } })
    @UseInterceptors(FileInterceptor("file", { limits: { fileSize: 10 * 1024 * 1024 } }))
    @Serialize(UploadDto)
    @ApiEndpoint({ summary: "Upload a file" })
    @ApiConsumes("multipart/form-data")
    @ApiBody({
        schema: {
            type: "object",
            required: ["file", "purpose"],
            properties: {
                file: { type: "string", format: "binary" },
                purpose: { type: "string", enum: Object.keys(UPLOAD_PURPOSE_CONFIG) },
            },
        },
    })
    @ApiSuccessResponse({
        description: "File uploaded successfully",
        type: UploadDto,
        isCreated: true,
    })
    @ResponseMessage("File uploaded successfully")
    async uploadFile(
        @UploadedFile() file: Express.Multer.File,
        @Body() dto: UploadFileDto,
        @CurrentUser() user: AuthenticatedUser,
    ) {
        if (!file) throw AppExceptions.badRequest("No file provided");

        return this.uploadService.upload(file, dto.purpose, user.id);
    }

    @Delete(":id")
    @RequirePermission(Permissions.Upload.DELETE)
    @ApiEndpoint({
        summary: "Delete an upload",
        permission: Permissions.Upload.DELETE.key,
    })
    @ApiSuccessResponse({ description: "Upload deleted successfully" })
    @ResponseMessage("Upload deleted successfully")
    async deleteUpload(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
        const upload = await this.uploadService.findByIdOrFail(id);

        await this.uploadService.delete(id);

        await this.auditService.log({
            actorId: user.id,
            auditAction: AuditActions.UPLOAD_DELETED,
            resourceId: id,
            details: { key: upload.key, purpose: upload.purpose },
        });
    }
}
