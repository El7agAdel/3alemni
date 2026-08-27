import { SortableFields } from "@common/interfaces";

export const UploadQuery = {
    sort: {
        allowed: {
            createdAt: "createdAt",
            size: "size",
            originalName: "originalName",
        },
        defaultField: "createdAt",
        defaultOrder: "desc",
    } as SortableFields,

    search: ["originalName"],
};
