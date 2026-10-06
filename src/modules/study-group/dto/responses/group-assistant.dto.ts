import { ApiProperty } from "@nestjs/swagger";
import { Expose, Type } from "class-transformer";

import { StudyGroupUserDto } from "./study-group-user.dto";

export class GroupAssistantDto {
    @Expose()
    @ApiProperty()
    id: string;

    @Expose({ name: "createdAt" })
    @ApiProperty({ description: "When the owner added the assistant" })
    addedAt: Date;

    @Expose()
    @Type(() => StudyGroupUserDto)
    @ApiProperty({ type: StudyGroupUserDto })
    user: StudyGroupUserDto;
}
