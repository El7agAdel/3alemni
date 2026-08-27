import { Controller, Get } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

import { ResponseMessage, Serialize } from "@common/decorators";
import { ApiSuccessResponse } from "@infra/swagger";

import { Permissions } from "../constants";
import { RequirePermission } from "../decorators";
import { PermissionDto } from "../dto/responses";
import { RbacService } from "../services";

@ApiTags("Permissions")
@ApiBearerAuth()
@Controller("permissions")
export class PermissionsController {
    constructor(private readonly rbacService: RbacService) {}

    @Get()
    @RequirePermission(Permissions.Role.READ)
    @Serialize(PermissionDto)
    @ApiOperation({ summary: "List all permissions" })
    @ApiSuccessResponse({
        description: "Permissions retrieved successfully",
        type: [PermissionDto],
    })
    @ResponseMessage("Permissions retrieved successfully")
    async listPermissions() {
        return this.rbacService.listPermissions();
    }
}
