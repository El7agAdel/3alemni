import * as fsSync from "node:fs";
import * as fs from "node:fs/promises";
import * as path from "node:path";

import { ConfigService } from "@config";
import { LoggingService } from "@infra/logging";

import { StorageProvider, StoredFileResult } from "../interfaces/storage.interfaces";

export class LocalStorageProvider implements StorageProvider {
    readonly driver = "local";
    readonly bucket = null;

    private readonly basePath: string;

    constructor(
        private readonly config: ConfigService,
        private readonly logger: LoggingService,
    ) {
        this.logger.setContext(LocalStorageProvider.name);
        this.basePath = this.config.storage.local.basePath;

        // Ensure base uploads directory exists
        fsSync.mkdirSync(this.basePath, { recursive: true });

        this.logger.info("Local storage provider initialized", {
            basePath: this.basePath,
        });
    }

    async store(key: string, buffer: Buffer, _mimeType: string): Promise<StoredFileResult> {
        this.assertSafePath(key);

        const fullPath = path.join(this.basePath, key);

        await fs.mkdir(path.dirname(fullPath), { recursive: true });
        await fs.writeFile(fullPath, buffer);

        return { key, size: buffer.length };
    }

    async delete(key: string): Promise<void> {
        this.assertSafePath(key);

        const fullPath = path.join(this.basePath, key);

        try {
            await fs.unlink(fullPath);
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code === "ENOENT") {
                this.logger.warn("File not found during delete", { key });

                return;
            }

            throw error;
        }
    }

    async exists(key: string): Promise<boolean> {
        this.assertSafePath(key);

        try {
            await fs.access(path.join(this.basePath, key));

            return true;
        } catch {
            return false;
        }
    }

    async read(key: string): Promise<Buffer> {
        this.assertSafePath(key);

        try {
            return await fs.readFile(path.join(this.basePath, key));
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code === "ENOENT") {
                throw new Error(`File not found: ${key}`, { cause: error });
            }

            throw error;
        }
    }

    /**
     * Make sure the path stays inside the upload dir and doesn't escape it.
     */
    private assertSafePath(key: string): void {
        if (key.includes("..")) {
            throw new Error(`Path escaping detected: ${key}`);
        }
    }
}
