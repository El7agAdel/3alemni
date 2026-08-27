import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Expose, Transform, Type } from "class-transformer";

import { PermissionDto } from "./permission.dto";

export class RoleDto {
    @Expose()
    @ApiProperty()
    id: string;

    @Expose()
    @ApiProperty({ example: "User Manager" })
    name: string;

    @Expose()
    @ApiPropertyOptional({ example: "Manage all user operations" })
    description?: string;

    @Expose()
    @ApiProperty({ default: false })
    isSystem: boolean;

    @Expose()
    @ApiProperty()
    createdAt: Date;

    @Expose()
    @ApiProperty()
    updatedAt: Date;
}

export class RoleListDto extends RoleDto {
    @Expose()
    @ApiProperty()
    @Transform(({ obj }) => obj._count?.userRoles ?? 0)
    userCount: number;

    @Expose()
    @ApiProperty()
    @Transform(({ obj }) => obj._count?.rolePermissions ?? 0)
    permissionCount: number;

    @Expose()
    @ApiProperty({ type: [PermissionDto] })
    @Transform(({ obj }) => obj.rolePermissions?.map((rp: { permission: unknown }) => rp.permission))
    @Type(() => PermissionDto)
    permissions?: PermissionDto[];
}

export class RoleDetailDto extends RoleDto {
    @Expose()
    @ApiProperty()
    @Transform(({ obj }) => obj._count?.userRoles ?? 0)
    userCount: number;

    @Expose()
    @Transform(({ obj }) => obj._count?.rolePermissions ?? 0)
    permissionCount: number;

    @Expose()
    @ApiProperty({ type: [PermissionDto] })
    @Transform(({ obj }) => obj.rolePermissions?.map((rp: { permission: unknown }) => rp.permission) ?? [])
    @Type(() => PermissionDto)
    permissions: PermissionDto[];
}
