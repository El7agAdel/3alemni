import { applyDecorators } from "@nestjs/common";
import { IsNotEmpty, IsOptional, IsString, Matches } from "class-validator";

export function IsPhone({ optional = false }: { optional?: boolean } = {}) {
    return applyDecorators(
        optional ? IsOptional() : IsNotEmpty(),
        IsString(),
        Matches(/^\+[1-9]\d{1,14}$/, {
            message: "Phone number must be in E.164 format (e.g., +1234567890)",
        }),
    );
}
