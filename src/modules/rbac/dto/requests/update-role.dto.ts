import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";

export class UpdateRoleDto {
    @ApiPropertyOptional({
        description: "Role visible name",
        example: "User Manager",
    })
    @IsOptional()
    @IsString()
    @IsNotEmpty()
    @MaxLength(40)
    name?: string;

    @ApiPropertyOptional({
        description: "Summary of what this role can do",
        example: "Manage all user operations",
    })
    @IsOptional()
    @IsString()
    description?: string;
}
