import { DATE_LOCALE } from "@common/constants";

export class DateUtil {
    /**
     * Format an ISO date to a friendly display.
     * Change format from "2026-05-08T00:00:00.000Z" to "8 April 2026".
     */
    static formatDisplay(date: Date): string {
        return date.toLocaleDateString(DATE_LOCALE, {
            day: "numeric",
            month: "long",
            year: "numeric",
        });
    }

    /**
     * Convert a duration string to seconds.
     * Take a value like "30s" and convert it to 30.
     */
    static durationToSeconds(duration: string): number {
        const match = duration.match(/^(\d+)([smhdw])$/i);

        if (!match) {
            throw new Error(`Invalid duration format: "${duration}". Expected format: 30s, 15m, 2h, 7d, 1w`);
        }

        const value = parseInt(match[1], 10);
        const unit = match[2].toLowerCase();

        const multipliers: Record<string, number> = {
            s: 1,
            m: 60,
            h: 3600,
            d: 86400,
            w: 604800,
        };

        return value * multipliers[unit];
    }

    /**
     * Create a date in the future by adding seconds to it.
     */
    static secondsFromNow(seconds: number): Date {
        return new Date(Date.now() + seconds * 1000);
    }

    /**
     * Create a date based on days ago number from now.
     */
    static daysAgo(days: number): Date {
        return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    }

    /**
     * Return the same day, but at midnight UTC with time zeroed.
     * Matches date only columns in database.
     */
    static todayUtc(): Date {
        const now = new Date();

        return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    }
}
