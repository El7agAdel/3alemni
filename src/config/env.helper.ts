/**
 * Get an env var or throw an error.
 */
export function env(key: string): string {
    const value = process.env[key];

    if (value === undefined) {
        throw new Error(`Missing environment variable: ${key}`);
    }

    return value;
}

/**
 * Get an env var, falling back to a default if unset.
 */
export function envOr(key: string, fallback: string): string {
    return process.env[key] ?? fallback;
}

/**
 * Get an env var as an integer.
 */
export function envInt(key: string): number {
    return parseInt(env(key), 10);
}

/**
 * Parse env values into a boolean.
 */
export function envBool(key: string): boolean {
    const value = env(key).toLowerCase();

    return ["1", "true", "yes", "on"].includes(value);
}

/**
 * Get comma-separated env values as an array.
 */
export function envList(key: string): string[] {
    const value = env(key);

    if (value === "*") return ["*"];

    return value
        .split(",")
        .map((str) => str.trim())
        .filter(Boolean);
}

/**
 * Get a friendly name for the current environment.
 */
export function envName(): string {
    const environment = env("NODE_ENV");

    return environment[0].toUpperCase() + environment.slice(1);
}

/**
 * Map SMTP accounts from comma-separated environment variables into an array of objects.
 */
export function mapEmailAccounts(
    hosts: string[],
    ports: string[],
    users: string[],
    passwords: string[],
    secureValues: string[],
    from: string[],
    fromName: string[],
) {
    if (users.length !== passwords.length || users.length !== from.length) {
        throw new Error("SMTP config mismatch: users, passwords, and from length must match");
    }

    return users.map((user, index) => ({
        host: hosts[index] || hosts[0],
        port: parseInt(ports[index] || ports[0], 10),
        user,
        password: passwords[index],
        secure: (secureValues[index] || secureValues[0]).toLowerCase() === "true",
        fromAddress: from[index],
        fromName: fromName[index] || fromName[0],
    }));
}
