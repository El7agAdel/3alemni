import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsOptional, IsString, IsUUID } from "class-validator";

import { IsBoolean, IsSearch } from "@common/decorators/validators";
import { BaseQueryDto } from "@common/dto";
import { UserStatus } from "@generated/enums";

export class UserQueryDto extends BaseQueryDto {
    @ApiPropertyOptional({
        description: "Search by username, email, phone, or name",
    })
    @IsSearch()
    search?: string;

    @ApiPropertyOptional({
        enum: UserStatus,
        description: "Filter by user status",
    })
    @IsOptional()
    @IsEnum(UserStatus)
    status?: UserStatus;

    @ApiPropertyOptional({ description: "Filter by role ID" })
    @IsOptional()
    @IsUUID()
    roleId?: string;

    @ApiPropertyOptional({
        description: "Filter users holding a specific permission key through any of their roles",
        example: "user:read",
    })
    @IsOptional()
    @IsString()
    permissionKey?: string;

    @ApiPropertyOptional({ description: "Filter by email verification status" })
    @IsOptional()
    @IsBoolean()
    emailVerified?: boolean;

    @ApiPropertyOptional({ description: "Filter by phone verification status" })
    @IsOptional()
    @IsBoolean()
    phoneVerified?: boolean;
}
