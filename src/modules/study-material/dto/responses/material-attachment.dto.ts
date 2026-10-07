import { ApiProperty } from "@nestjs/swagger";
import { Expose, Transform } from "class-transformer";

import { UploadUtil } from "@common/utils";

export class MaterialAttachmentDto {
    @Expose()
    @ApiProperty()
    id: string;

    @Expose()
    @ApiProperty({ description: "Send these keys back in `attachments` to keep the files on update" })
    key: string;

    @Expose()
    @Transform(({ obj }) => UploadUtil.resolveUrl(obj.key))
    @ApiProperty()
    url: string;

    @Expose()
    @ApiProperty({ example: "chapter-3.pdf" })
    originalName: string;

    @Expose()
    @ApiProperty({ example: "application/pdf" })
    mimeType: string;

    @Expose()
    @ApiProperty({ description: "Size in bytes" })
    size: number;
}
