import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Expose } from "class-transformer";

export class PermissionDto {
    @Expose()
    @ApiProperty()
    id: string;

    @Expose()
    @ApiProperty({ example: "user:read" })
    key: string;

    @Expose()
    @ApiProperty({ example: "user" })
    resource: string;

    @Expose()
    @ApiProperty({ example: "suspend" })
    action: string;

    @Expose()
    @ApiProperty({ example: "Suspend Users" })
    displayName: string;

    @Expose()
    @ApiPropertyOptional({ example: "Suspend and unsuspend user accounts" })
    description?: string;

    @Expose()
    @ApiProperty({ example: "User Management" })
    group: string;
}
