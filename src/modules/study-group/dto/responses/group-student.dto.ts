import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Expose, Type } from "class-transformer";

import { EnrollmentStatus } from "@generated/enums";

import { StudyGroupUserDto } from "./study-group-user.dto";

export class GroupStudentDto {
    @Expose()
    @ApiProperty({ description: "Enrollment id" })
    id: string;

    @Expose()
    @ApiProperty({ enum: EnrollmentStatus })
    status: EnrollmentStatus;

    @Expose()
    @ApiProperty()
    joinedAt: Date;

    @Expose()
    @ApiPropertyOptional()
    leftAt?: Date;

    @Expose()
    @Type(() => StudyGroupUserDto)
    @ApiProperty({ type: StudyGroupUserDto })
    student: StudyGroupUserDto;
}
