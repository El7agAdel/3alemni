import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Expose, Transform, Type } from "class-transformer";

import { StudyMaterialType } from "@generated/enums";

import { MaterialAttachmentDto } from "./material-attachment.dto";

export class StudyMaterialDto {
    @Expose()
    @ApiProperty()
    id: string;

    @Expose()
    @ApiProperty()
    studyGroupId: string;

    @Expose()
    @ApiProperty()
    name: string;

    @Expose()
    @ApiProperty({ enum: StudyMaterialType })
    type: StudyMaterialType;

    @Expose()
    @ApiPropertyOptional()
    description?: string;

    @Expose()
    // Without a String target, class-transformer tries to rebuild the Prisma Decimal and throws
    @Type(() => String)
    @Transform(({ obj }) => obj.maxScore?.toFixed(2) ?? null)
    @ApiPropertyOptional({ example: "20.00" })
    maxScore?: string;

    @Expose()
    @ApiPropertyOptional()
    externalUrl?: string;

    @Expose()
    @ApiProperty()
    position: number;

    @Expose()
    @ApiPropertyOptional()
    dueAt?: Date;

    @Expose()
    @ApiPropertyOptional({ description: "Null while the material is a draft" })
    publishedAt?: Date;

    @Expose()
    @Transform(({ obj }) => obj.publishedAt instanceof Date && obj.publishedAt <= new Date())
    @ApiProperty({ description: "Students only see published material" })
    isPublished: boolean;

    @Expose()
    @Type(() => MaterialAttachmentDto)
    @ApiProperty({ type: [MaterialAttachmentDto] })
    attachments: MaterialAttachmentDto[];

    @Expose()
    @ApiProperty()
    createdAt: Date;

    @Expose()
    @ApiProperty()
    updatedAt: Date;
}
