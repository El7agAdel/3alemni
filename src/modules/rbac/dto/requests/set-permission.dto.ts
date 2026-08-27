import { ApiProperty } from "@nestjs/swagger";
import { ArrayUnique, IsArray, IsString } from "class-validator";

export class SetPermissionDto {
    @ApiProperty({
        description: "Array of permission keys to assign to the role",
        example: ["user:read", "user:create"],
        type: [String],
    })
    @IsArray()
    @ArrayUnique()
    @IsString({ each: true })
    permissionKeys: string[];
}
