/**
 * Purposes categorize uploads into types and enable specific validation rules per purpose.
 */
export enum UploadPurpose {
    USER_AVATAR = "USER_AVATAR",
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
};

/**
 * Map actual MIME type of the file to an extension we can use for this specific MIME.
 */
export const MIME_TO_EXTENSION: Record<string, string> = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/webp": "webp",
};
