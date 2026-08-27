import { ApiProperty } from "@nestjs/swagger";
import { Expose, Transform, Type } from "class-transformer";

import { RoleDto } from "@modules/rbac/dto/responses";

import { UserDto } from "./user.dto";

export class UserDetailDto extends UserDto {
    @Expose()
    @ApiProperty()
    @Transform(({ obj }) => obj._count?.userRoles ?? 0)
    roleCount: number;

    @Expose()
    @ApiProperty({ description: "Number of active sessions" })
    @Transform(({ obj }) => obj._count?.sessions ?? 0)
    sessionCount: number;

    @Expose()
    @ApiProperty({ type: [RoleDto] })
    @Transform(({ obj }) => obj.userRoles?.map((ur: { role: unknown }) => ur.role) ?? [])
    @Type(() => RoleDto)
    roles: RoleDto[];
}
