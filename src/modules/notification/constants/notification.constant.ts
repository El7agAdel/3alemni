import { SortableFields } from "@common/interfaces";

export const NotificationQuery = {
    sort: {
        allowed: {
            createdAt: "createdAt",
            readAt: "readAt",
        },
        defaultField: "createdAt",
        defaultOrder: "desc",
    } as SortableFields,
};

export const BroadcastQuery = {
    sort: {
        allowed: {
            createdAt: "createdAt",
        },
        defaultField: "createdAt",
        defaultOrder: "desc",
    } as SortableFields,
};
