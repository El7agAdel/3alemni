import { applyDecorators } from "@nestjs/common";
import { Transform } from "class-transformer";
import { IsNotEmpty, IsOptional, IsString, Matches, MaxLength, MinLength } from "class-validator";

export function IsUsername({ optional = false }: { optional?: boolean } = {}) {
    return applyDecorators(
        optional ? IsOptional() : IsNotEmpty(),
        IsString(),
        MinLength(4),
        MaxLength(20),
        Matches(/^[a-zA-Z]/, {
            message: "Username must start with a letter",
        }),
        Matches(/^[a-zA-Z0-9_-]+$/, {
            message: "Username can only contain letters, numbers, underscores and hyphens",
        }),
        Transform(({ value }: { value: string }) => value.trim().toLowerCase()),
    );
}
