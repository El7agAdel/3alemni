import { UseInterceptors } from "@nestjs/common";
import { ClassConstructor } from "class-transformer";

import { SerializeInterceptor } from "../interceptors";

/**
 * Applies serialization to the provided DTO using the serializer interceptor.
 * Works with single objects, arrays, and paginated results.
 */
export function Serialize<T>(dto: ClassConstructor<T>) {
    return UseInterceptors(new SerializeInterceptor(dto));
}
