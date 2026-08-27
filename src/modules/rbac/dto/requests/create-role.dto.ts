import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsArray, IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";

export class CreateRoleDto {
    @ApiProperty({
        description: "Unique name for the role",
        example: "User Manager",
    })
    @IsString()
    @IsNotEmpty()
    @MaxLength(40)
    name: string;

    @ApiPropertyOptional({
        description: "Summary of what this role can do",
        example: "Manages user operations",
    })
    @IsOptional()
    @IsString()
    @IsNotEmpty()
    description?: string;

    @ApiPropertyOptional({ example: ["user:read", "user:update"] })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    permissionKeys?: string[];
}
