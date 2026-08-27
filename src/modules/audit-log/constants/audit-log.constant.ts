import { SortableFields } from "@common/interfaces";

export const AuditLogQuery = {
    sort: {
        allowed: {
            createdAt: "createdAt",
            resource: "resource",
            action: "action",
        },
        defaultField: "createdAt",
        defaultOrder: "desc",
    } as SortableFields,

    search: ["resourceId", "requestId", "ipAddress"],
};
