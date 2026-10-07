import { SortableFields } from "@common/interfaces";
import { StudyMaterialType } from "@generated/enums";

/**
 * Material types that are marked, so they may have a maxScore. Videos and written content may not.
 */
export const SCORED_MATERIAL_TYPES: readonly StudyMaterialType[] = [
    StudyMaterialType.QUIZ,
    StudyMaterialType.TEST,
    StudyMaterialType.CHALLENGE,
];

export const MAX_ATTACHMENTS = 10;

export const StudyMaterialQuery = {
    sort: {
        allowed: {
            position: "position",
            name: "name",
            dueAt: "dueAt",
            publishedAt: "publishedAt",
            createdAt: "createdAt",
        },
        defaultField: "position",
        defaultOrder: "asc",
    } as SortableFields,

    search: ["name"],
};
