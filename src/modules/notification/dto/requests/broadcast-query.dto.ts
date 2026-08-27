import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsIn, IsOptional, IsString } from "class-validator";

import { BaseQueryDto } from "@common/dto";
import { BroadcastStatus, NotificationChannelType } from "@generated/enums";

import { BroadcastAudience } from "../../constants";

export class BroadcastQueryDto extends BaseQueryDto {
    @ApiPropertyOptional({ enum: NotificationChannelType })
    @IsOptional()
    @IsEnum(NotificationChannelType)
    channel?: NotificationChannelType;

    @ApiPropertyOptional({ enum: BroadcastAudience })
    @IsOptional()
    @IsString()
    @IsIn(Object.values(BroadcastAudience))
    audience?: BroadcastAudience;

    @ApiPropertyOptional({ enum: BroadcastStatus })
    @IsOptional()
    @IsEnum(BroadcastStatus)
    status?: BroadcastStatus;
}
