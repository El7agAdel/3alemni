export class ObjectUtil {
    /**
     * Remove undefined values from an object.
     */
    static stripUndefined<T extends object>(obj: T): Record<string, unknown> {
        return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
    }
}
