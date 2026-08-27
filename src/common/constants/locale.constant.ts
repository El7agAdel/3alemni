/**
 * Locale settings for the whole application.
 *
 * Kept here rather than inline so that supporting a new language, or formatting
 * dates for a different region, is a one-file change instead of a hunt through
 * DTOs and utils.
 */

/**
 * Languages a user may pick. Validated on profile updates and advertised in Swagger.
 * Add ISO 639-1 codes as you add translations.
 */
export const SUPPORTED_LANGUAGES = ["en"] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

/**
 * Language assigned to new users. Must also match the `@default` on
 * `User.language` in prisma/schema/auth.prisma, which cannot import this file.
 */
export const DEFAULT_LANGUAGE: SupportedLanguage = "en";

/**
 * BCP 47 tag used to format dates shown to users - in emails and API responses
 * alike. "en-GB" renders 8 April 2026; "en-US" renders April 8, 2026.
 */
export const DATE_LOCALE = "en-GB";
