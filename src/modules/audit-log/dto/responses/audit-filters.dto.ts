import { ApiProperty } from "@nestjs/swagger";
import { Expose } from "class-transformer";

export class AuditFiltersDto {
    @Expose()
    @ApiProperty({ type: [String], example: ["role", "user", "broadcast"] })
    resources: string[];

    @Expose()
    @ApiProperty({ type: [String], example: ["created", "updated", "deleted"] })
    actions: string[];

    @Expose()
    @ApiProperty({
        description: "Actions available for every resource",
        example: { role: ["created", "updated", "deleted", "permissions_changed"] },
    })
    resourceActions: Record<string, string[]>;
}
