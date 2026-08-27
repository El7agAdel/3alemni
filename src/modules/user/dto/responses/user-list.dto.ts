import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Expose, Transform, Type } from "class-transformer";

import { RoleDto } from "@modules/rbac/dto/responses";

import { UserDto } from "./user.dto";

export class UserListDto extends UserDto {
    @Expose()
    @ApiProperty({ description: "Number of roles assigned" })
    @Transform(({ obj }) => obj._count?.userRoles ?? 0)
    roleCount: number;

    @Expose()
    @ApiPropertyOptional({ type: [RoleDto] })
    @Transform(({ obj }) => obj.userRoles?.map((ur: { role: unknown }) => ur.role))
    @Type(() => RoleDto)
    roles?: RoleDto[];
}
