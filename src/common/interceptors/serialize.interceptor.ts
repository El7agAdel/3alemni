import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { type ClassConstructor, plainToInstance } from "class-transformer";
import { map, Observable } from "rxjs";

/**
 * Transforms response data through a DTO using class-transformer.
 * Handles single objects, arrays, and paginated results, and strips any field not
 * explicitly marked with @Expose on the DTO.
 */
@Injectable()
export class SerializeInterceptor<T> implements NestInterceptor {
    constructor(private dto: ClassConstructor<T>) {}

    intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
        return next.handle().pipe(map((data) => this.serialize(data)));
    }

    private serialize(data: unknown): unknown {
        const options = { excludeExtraneousValues: true };

        if (this.isPaginatedResult(data)) {
            return {
                items: data.items.map((item) => plainToInstance(this.dto, item, options)),
                meta: data.meta,
            };
        }

        if (this.isArray(data)) {
            return data.map((item) => plainToInstance(this.dto, item, options));
        }

        return plainToInstance(this.dto, data, options);
    }

    /**
     * Check if data is an array.
     * Array.isArray narrows an unknown to any[], which drops type safety on every element.
     * Going through a guard narrows to unknown[] instead.
     */
    private isArray(data: unknown): data is unknown[] {
        return Array.isArray(data);
    }

    /**
     * Check if data is a paginated result.
     */
    private isPaginatedResult(data: unknown): data is { items: unknown[]; meta: unknown } {
        return (
            typeof data === "object" &&
            data !== null &&
            "items" in data &&
            "meta" in data &&
            Array.isArray((data as { items: unknown[] }).items)
        );
    }
}
