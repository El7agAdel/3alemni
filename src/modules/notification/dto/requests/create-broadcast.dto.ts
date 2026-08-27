import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";

import { IsBoolean } from "@common/decorators/validators";
import { NotificationChannelType } from "@generated/enums";

import { AudienceSelectionDto } from "./audience-selection.dto";

export class CreateBroadcastDto extends AudienceSelectionDto {
    @ApiProperty({ example: "Scheduled maintenance tonight" })
    @IsString()
    @IsNotEmpty()
    @MaxLength(60)
    title: string;

    @ApiProperty({
        example: "We'll be performing maintenance from 11 PM to midnight. The app may be briefly unavailable.",
    })
    @IsString()
    @IsNotEmpty()
    @MaxLength(500)
    body: string;

    @ApiProperty({
        enum: NotificationChannelType,
        example: NotificationChannelType.PUSH,
    })
    @IsEnum(NotificationChannelType)
    channel: NotificationChannelType;

    @ApiPropertyOptional({
        description: "Persist a notification row per recipient. Omit to use the broadcast default",
    })
    @IsOptional()
    @IsBoolean()
    persistAsNotification?: boolean;
}
