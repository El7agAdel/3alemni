import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Expose } from "class-transformer";

import { StudyGroupStatus } from "@generated/enums";

export class StudyGroupSummaryDto {
    @Expose()
    @ApiProperty()
    id: string;

    @Expose()
    @ApiProperty()
    name: string;

    @Expose()
    @ApiPropertyOptional()
    subject?: string;

    @Expose()
    @ApiProperty({ enum: StudyGroupStatus })
    status: StudyGroupStatus;
}
