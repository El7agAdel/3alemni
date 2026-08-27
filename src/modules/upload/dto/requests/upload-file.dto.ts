import { ApiProperty } from "@nestjs/swagger";
import { IsEnum } from "class-validator";

import { UploadPurpose } from "../../constants";

export class UploadFileDto {
    @ApiProperty({
        description: "What this file is for. This determines allowed types and size limits",
        enum: UploadPurpose,
        example: UploadPurpose.USER_AVATAR,
    })
    @IsEnum(UploadPurpose)
    purpose: UploadPurpose;
}
