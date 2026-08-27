/**
 * Application identity, derived from a single APP_NAME in the environment.
 *
 * Code inside the DI container should read `ConfigService.app` instead; these
 * helpers exist for the code that runs outside it - plain email and WhatsApp
 * template classes, static utils, and the Joi env schema - so that renaming the
 * product means editing .env and nothing else.
 *
 * Every value is read lazily rather than at import time: ConfigModule copies the
 * .env file and the schema defaults into process.env while modules are being
 * instantiated, which happens after this file has already been imported.
 */

/** Used when APP_NAME is absent, which outside a booted app only happens in unit tests. */
const DEFAULT_APP_NAME = "App";

/**
 * Turn a display name into a lowercase, dash-separated identifier.
 * "My App" -> "my-app"
 */
export function slugify(value: string): string {
    return value
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

/**
 * Display name, exactly as written in APP_NAME: "My App".
 * Use for anything a human reads - emails, notification copy, Swagger.
 */
export function appName(): string {
    return process.env.APP_NAME?.trim() || DEFAULT_APP_NAME;
}

/**
 * Identifier form: "my-app". Use for machine-facing names such as cache
 * key prefixes, the JWT issuer, and container or volume names.
 */
export function appSlug(): string {
    return process.env.APP_SLUG?.trim() || slugify(appName()) || slugify(DEFAULT_APP_NAME);
}

/**
 * Underscore form: "my_app". Use where dashes are not allowed,
 * such as WhatsApp template names.
 */
export function appSnake(): string {
    return appSlug().replace(/-/g, "_");
}

/**
 * Upper-case identifier form: "MY-APP". Use for prefixes on generated
 * public codes.
 */
export function appUpper(): string {
    return appSlug().toUpperCase();
}
