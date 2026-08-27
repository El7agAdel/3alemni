import { applyDecorators } from "@nestjs/common";
import { Transform } from "class-transformer";
import { IsNotEmpty, IsOptional, IsString } from "class-validator";

/**
 * Validates a login identifier field, which may be a username, email, or phone.
 * Format-specific validation happens in the auth service, not here.
 */
export function IsIdentifier({ optional = false }: { optional?: boolean } = {}) {
    return applyDecorators(
        optional ? IsOptional() : IsNotEmpty(),
        IsString(),
        Transform(({ value }: { value: string }) => value.trim().toLowerCase()),
    );
}
