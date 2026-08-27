import { SetMetadata } from "@nestjs/common";

export const RESPONSE_MESSAGE_KEY = "response_message";
export const SKIP_TRANSFORM_KEY = "skip_transform";

/**
 * Sets a custom success message for the response, read by the global ResponseInterceptor.
 */
export const ResponseMessage = (message: string) => SetMetadata(RESPONSE_MESSAGE_KEY, message);

/**
 * Skips response envelope transformation for this endpoint.
 * Useful for streaming responses or file downloads.
 */
export const SkipTransform = () => SetMetadata(SKIP_TRANSFORM_KEY, true);
