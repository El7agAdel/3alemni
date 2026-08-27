import { ApiProperty } from "@nestjs/swagger";
import { Expose, Transform } from "class-transformer";

import { UploadUtil } from "@common/utils";

export class UploadDto {
    @Expose()
    @ApiProperty()
    id: string;

    @Expose()
    @ApiProperty({ example: "avatars/a8f3c2d1.png" })
    key: string;

    @Expose()
    @ApiProperty({ description: "Full URL of the file" })
    @Transform(({ obj }) => UploadUtil.resolveUrl(obj.key))
    url: string;

    @Expose()
    @ApiProperty({
        description: "Which group of uploads this file belongs to",
        example: "USER_AVATAR",
    })
    purpose: string;

    @Expose()
    @ApiProperty({
        description: "ID of the entity this upload is attached to. Null if unattached",
    })
    uploadableId: string | null;

    @Expose()
    @ApiProperty({ example: "avatar.png" })
    originalName: string;

    @Expose()
    @ApiProperty({ example: "image/png" })
    mimeType: string;

    @Expose()
    @ApiProperty({ description: "File size in bytes", example: 184320 })
    size: number;

    @Expose()
    @ApiProperty({ description: "User ID of who uploaded this file" })
    uploadedBy: string;

    @Expose()
    @ApiProperty()
    createdAt: Date;
}
