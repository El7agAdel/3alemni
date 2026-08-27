import { applyDecorators } from "@nestjs/common";
import { Transform } from "class-transformer";
import { IsString } from "class-validator";

import { UploadUtil } from "../../utils";

/**
 * Marks a DTO field as a storage upload key.
 * Validates the value is a string and normalizes it if the client sent a full URL instead of a key.
 */
export function IsUploadKey(): PropertyDecorator {
    return applyDecorators(
        IsString(),
        Transform(({ value }: { value: unknown }) =>
            typeof value === "string" ? UploadUtil.extractKey(value) : value,
        ),
    );
}
