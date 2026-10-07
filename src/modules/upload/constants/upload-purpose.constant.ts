/**
 * Purposes categorize uploads into types and enable specific validation rules per purpose.
 */
export enum UploadPurpose {
    USER_AVATAR = "USER_AVATAR",
    STUDY_MATERIAL = "STUDY_MATERIAL",
}

export interface UploadPurposeConfig {
    storagePrefix: string;
    allowedMimeTypes: string[];
    maxSizeBytes: number;
}

/**
 * Defines the validation rules for each upload purpose.
 */
export const UPLOAD_PURPOSE_CONFIG: Record<UploadPurpose, UploadPurposeConfig> = {
    [UploadPurpose.USER_AVATAR]: {
        allowedMimeTypes: ["image/png", "image/jpeg", "image/webp"],
        maxSizeBytes: 2 * 1024 * 1024,
        storagePrefix: "avatars",
    },
    // Videos are linked with StudyMaterial.externalUrl instead: the upload endpoint caps files at 10 MB.
    [UploadPurpose.STUDY_MATERIAL]: {
        allowedMimeTypes: [
            "application/pdf",
            "image/png",
            "image/jpeg",
            "image/webp",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        ],
        maxSizeBytes: 10 * 1024 * 1024,
        storagePrefix: "study-materials",
    },
};

/**
 * Map actual MIME type of the file to an extension we can use for this specific MIME.
 */
export const MIME_TO_EXTENSION: Record<string, string> = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/webp": "webp",
    "application/pdf": "pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
};
