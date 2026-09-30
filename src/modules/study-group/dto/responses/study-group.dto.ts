import { ApiProperty } from "@nestjs/swagger";
import { Expose, Transform } from "class-transformer";

import { PaymentMethod } from "@generated/enums";

import { GroupRole } from "../../constants";

import { StudyGroupPreviewDto } from "./study-group-preview.dto";

/**
 * A group as its members see it. The join code is never included: the owner reads it
 * from its own endpoint.
 */
export class StudyGroupDto extends StudyGroupPreviewDto {
    @Expose()
    @ApiProperty({ enum: PaymentMethod })
    paymentMethod: PaymentMethod;

    @Expose()
    @Transform(({ obj }) => obj._count?.enrollments ?? 0)
    @ApiProperty({ description: "Number of ACTIVE students" })
    studentCount: number;

    @Expose()
    @ApiProperty({
        enum: Object.values(GroupRole),
        nullable: true,
        description: "How I am linked to this group. Null in the admin list for groups I am not linked to",
    })
    myRole: GroupRole | null;

    @Expose()
    @ApiProperty()
    createdAt: Date;

    @Expose()
    @ApiProperty()
    updatedAt: Date;
}
