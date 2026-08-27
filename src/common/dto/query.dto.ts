import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from "class-validator";

import { type SortOrder } from "../interfaces";

/**
 * Base query DTO with pagination and sorting.
 * Extended by other entity-specific query DTOs.
 */
export class BaseQueryDto {
    @ApiPropertyOptional({
        description: "Page number",
        default: 1,
        minimum: 1,
        example: 1,
    })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page?: number;

    @ApiPropertyOptional({
        description: "Items per page",
        default: 100,
        minimum: 1,
        maximum: 500,
        example: 20,
    })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(500)
    limit?: number;

    @ApiPropertyOptional({
        description: "Field to sort by",
        example: "createdAt",
    })
    @IsOptional()
    @IsString()
    sortBy?: string;

    @ApiPropertyOptional({
        description: "Sort order",
        enum: ["asc", "desc"],
        default: "asc",
        example: "desc",
    })
    @IsOptional()
    @IsIn(["asc", "desc"])
    sortOrder?: SortOrder;

    @ApiPropertyOptional({
        description: "Comma separated list of relations to include",
        example: "roles",
    })
    @IsOptional()
    @IsString()
    include?: string;
}
