import { Controller, Get, Param, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

import { ResponseMessage, Serialize } from "@common/decorators";
import { ApiPaginatedResponse, ApiSuccessResponse } from "@infra/swagger";
import { Permissions, RequirePermission } from "@modules/rbac";
import { AuditActionNames, AuditResourceActions, AuditResources } from "@shared/audit";

import { AuditLogQueryDto } from "../dto/requests";
import { AuditFiltersDto, AuditLogDetailDto, AuditLogListDto } from "../dto/responses";
import { AuditLogService } from "../services/audit-log.service";

@ApiTags("Audit Logs")
@ApiBearerAuth()
@Controller("audit-logs")
export class AuditLogController {
    constructor(private readonly auditLogService: AuditLogService) {}

    @Get("filters")
    @RequirePermission(Permissions.AuditLog.READ)
    @Serialize(AuditFiltersDto)
    @ApiOperation({ summary: "Get available filter options for audit logs" })
    @ApiSuccessResponse({
        description: "Audit filter options retrieved successfully",
        type: AuditFiltersDto,
    })
    @ResponseMessage("Audit filter options retrieved successfully")
    getFilters() {
        return {
            resources: AuditResources,
            actions: AuditActionNames,
            resourceActions: AuditResourceActions,
        };
    }

    @Get()
    @RequirePermission(Permissions.AuditLog.READ)
    @Serialize(AuditLogListDto)
    @ApiOperation({ summary: "List audit logs" })
    @ApiPaginatedResponse({
        description: "Audit logs retrieved successfully",
        type: [AuditLogListDto],
    })
    @ResponseMessage("Audit logs retrieved successfully")
    list(@Query() query: AuditLogQueryDto) {
        return this.auditLogService.list(query);
    }

    @Get(":id")
    @RequirePermission(Permissions.AuditLog.READ)
    @Serialize(AuditLogDetailDto)
    @ApiOperation({ summary: "Get audit log details" })
    @ApiSuccessResponse({
        description: "Audit log retrieved successfully",
        type: AuditLogDetailDto,
    })
    @ResponseMessage("Audit log retrieved successfully")
    findOne(@Param("id") id: string) {
        return this.auditLogService.findById(id);
    }
}
