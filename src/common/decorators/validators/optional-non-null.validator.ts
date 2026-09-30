import { ValidateIf } from "class-validator";

/**
 * Like @IsOptional(), but only skips a missing field: an explicit null is still validated
 * (and rejected). For optional fields whose database column can't be null.
 */
export function IsOptionalNonNull(): PropertyDecorator {
    return ValidateIf((_object, value) => value !== undefined);
}
