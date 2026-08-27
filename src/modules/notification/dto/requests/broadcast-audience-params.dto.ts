import { ApiPropertyOptional } from "@nestjs/swagger";
import { ArrayNotEmpty, IsArray, IsOptional, IsString, IsUUID } from "class-validator";

export class BroadcastAudienceParamsDto {
    @ApiPropertyOptional({
        type: [String],
        description: "Target these explicit user IDs",
    })
    @IsOptional()
    @IsArray()
    @ArrayNotEmpty()
    @IsUUID(undefined, { each: true })
    userIds?: string[];

    @ApiPropertyOptional({
        type: [String],
        description: "Target users holding any of these role IDs",
    })
    @IsOptional()
    @IsArray()
    @ArrayNotEmpty()
    @IsString({ each: true })
    roleIds?: string[];
}
