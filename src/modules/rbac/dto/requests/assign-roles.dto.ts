import { ApiProperty } from "@nestjs/swagger";
import { ArrayMinSize, ArrayUnique, IsArray, IsString } from "class-validator";

export class AssignRoleDto {
    @ApiProperty({
        description: "Role IDs to assign",
        example: ["uuid-1", "uuid-2"],
        type: [String],
    })
    @IsArray()
    @ArrayUnique()
    @ArrayMinSize(1)
    @IsString({ each: true })
    roleIds: string[];
}
