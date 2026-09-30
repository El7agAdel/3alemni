import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Expose, Type } from "class-transformer";

import { JoinRequestStatus } from "@generated/enums";

import { StudyGroupSummaryDto } from "./study-group-summary.dto";
import { StudyGroupUserDto } from "./study-group-user.dto";

export class JoinRequestDto {
    @Expose()
    @ApiProperty()
    id: string;

    @Expose()
    @ApiProperty({ enum: JoinRequestStatus })
    status: JoinRequestStatus;

    @Expose()
    @ApiPropertyOptional({ description: "The student's note" })
    message?: string;

    @Expose()
    @ApiPropertyOptional({ description: "The teacher's note on approve or reject" })
    decisionNote?: string;

    @Expose()
    @ApiPropertyOptional()
    decidedAt?: Date;

    @Expose({ name: "studyGroup" })
    @Type(() => StudyGroupSummaryDto)
    @ApiProperty({ type: StudyGroupSummaryDto })
    group: StudyGroupSummaryDto;

    @Expose()
    @Type(() => StudyGroupUserDto)
    @ApiProperty({ type: StudyGroupUserDto })
    student: StudyGroupUserDto;

    @Expose()
    @ApiProperty({ description: "When the student (last) asked" })
    createdAt: Date;

    @Expose()
    @ApiProperty()
    updatedAt: Date;
}
