import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsIn, IsOptional, IsString, Validate, ValidateNested } from "class-validator";

import { BroadcastAudience } from "../../constants";
import { BroadcastAudienceParamsValidator } from "../../validators";

import { BroadcastAudienceParamsDto } from "./broadcast-audience-params.dto";

export class AudienceSelectionDto {
    @ApiProperty({
        enum: BroadcastAudience,
        example: BroadcastAudience.NEW_USERS,
    })
    @IsString()
    @IsIn(Object.values(BroadcastAudience))
    @Validate(BroadcastAudienceParamsValidator)
    audience: BroadcastAudience;

    @ApiPropertyOptional({
        type: BroadcastAudienceParamsDto,
        description: "Audience-specific parameters, required for the USER_IDS and ROLES audiences",
    })
    @IsOptional()
    @ValidateNested()
    @Type(() => BroadcastAudienceParamsDto)
    audienceParams?: BroadcastAudienceParamsDto;
}
