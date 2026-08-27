import * as crypto from "node:crypto";

import * as argon2 from "argon2";

export class PasswordUtil {
    /**
     * Hash a text password using Argon2id.
     */
    static async hash(password: string): Promise<string> {
        return argon2.hash(password, {
            type: argon2.argon2id,
            memoryCost: 65536,
            timeCost: 3,
            parallelism: 4,
        });
    }

    /**
     * Verify a text password against a stored hash.
     */
    static async verify(password: string, hash: string): Promise<boolean> {
        try {
            return await argon2.verify(hash, password);
        } catch {
            return false;
        }
    }

    /**
     * Check if a new password is the same as the old one.
     */
    static async isSamePassword(newPassword: string, oldHash: string): Promise<boolean> {
        return this.verify(newPassword, oldHash);
    }

    /**
     * Generate a random secure password.
     */
    static generateRandom(length = 16): string {
        const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()";

        return Array.from(crypto.randomBytes(length))
            .map((byte) => chars[byte % chars.length])
            .join("");
    }
}
