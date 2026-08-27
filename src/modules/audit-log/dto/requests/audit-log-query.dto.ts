import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsDateString, IsNotEmpty, IsOptional, IsString, IsUUID } from "class-validator";

import { IsSearch } from "@common/decorators/validators";
import { BaseQueryDto } from "@common/dto";

export class AuditLogQueryDto extends BaseQueryDto {
    @ApiPropertyOptional({
        description: "Search by resource ID, request ID, or IP address",
    })
    @IsSearch()
    search?: string;

    @ApiPropertyOptional({
        description: "Filter by resource type",
        example: "role",
    })
    @IsOptional()
    @IsString()
    @IsNotEmpty()
    resource?: string;

    @ApiPropertyOptional({ description: "Filter by action", example: "created" })
    @IsOptional()
    @IsString()
    @IsNotEmpty()
    action?: string;

    @ApiPropertyOptional({ description: "Filter by actor using user ID" })
    @IsOptional()
    @IsUUID()
    @IsNotEmpty()
    actorId?: string;

    @ApiPropertyOptional({ description: "Filter by target resource ID" })
    @IsOptional()
    @IsUUID()
    @IsNotEmpty()
    resourceId?: string;

    @ApiPropertyOptional({
        description: "Filter from date",
        example: "2026-01-01",
    })
    @IsOptional()
    @IsDateString()
    @IsNotEmpty()
    from?: string;

    @ApiPropertyOptional({ description: "Filter to date", example: "2026-12-31" })
    @IsOptional()
    @IsDateString()
    @IsNotEmpty()
    to?: string;
}
