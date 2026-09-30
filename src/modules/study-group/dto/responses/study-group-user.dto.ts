import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Expose, Transform } from "class-transformer";

import { UploadUtil } from "@common/utils";

/**
 * A user as shown next to a group: the owner, a student, an assistant.
 */
export class StudyGroupUserDto {
    @Expose()
    @ApiProperty()
    id: string;

    @Expose()
    @ApiProperty()
    username: string;

    @Expose()
    @ApiPropertyOptional()
    displayName?: string;

    @Expose()
    @ApiPropertyOptional()
    firstName?: string;

    @Expose()
    @ApiPropertyOptional()
    lastName?: string;

    @Expose()
    @Transform(({ obj }) => UploadUtil.resolveUrl(obj.avatar))
    @ApiPropertyOptional()
    avatar?: string;
}
