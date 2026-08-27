import { Injectable } from "@nestjs/common";

import { ErrorCode } from "@common/constants";
import { DomainExceptions } from "@common/exceptions";

import { UploadPurpose } from "../constants";
import { UploadRepository } from "../repositories/upload.repository";

import { UploadService } from "./upload.service";

@Injectable()
export class UploadPublicService {
    constructor(
        private readonly uploadRepo: UploadRepository,
        private readonly uploadService: UploadService,
    ) {}

    /**
     * Confirm that a key actually exists in the system.
     */
    async validateKeyExists(key: string): Promise<void> {
        const upload = await this.uploadRepo.findByKey(key);

        if (!upload) {
            throw DomainExceptions.business(ErrorCode.UPLOAD_KEY_INVALID, "Upload key not found", { key });
        }
    }

    /**
     * Confirm that a key exists and is for the right purpose.
     */
    async validateKeyForPurpose(key: string, purpose: UploadPurpose): Promise<void> {
        const upload = await this.uploadRepo.findByKey(key);

        if (!upload) {
            throw DomainExceptions.business(ErrorCode.UPLOAD_KEY_INVALID, "Upload key not found", { key });
        }

        if (upload.purpose !== (purpose as string)) {
            throw DomainExceptions.business(
                ErrorCode.UPLOAD_PURPOSE_MISMATCH,
                "Upload key belongs to a different purpose",
                {
                    key,
                    actual: upload.purpose,
                    expected: purpose,
                },
            );
        }
    }

    /**
     * Attach the owner entity id into the upload row for reference.
     * Doesn't reattach if the upload is already attached to the same owner.
     */
    async attach(key: string, ownerId: string): Promise<void> {
        return this.uploadService.attach(key, ownerId);
    }

    /**
     * Replace one upload with another for an entity during an update.
     * No-op if the keys are the same. Validates and attaches the new key if provided,
     * and cleans up the old file.
     */
    async replace(
        oldKey: string | null,
        newKey: string | null,
        purpose: UploadPurpose,
        ownerId: string,
    ): Promise<void> {
        if (oldKey === newKey) return;

        if (newKey) {
            await this.validateKeyForPurpose(newKey, purpose);
            await this.attach(newKey, ownerId);
        }

        if (oldKey) await this.delete(oldKey);
    }

    /**
     * Delete every upload owned by the given entity.
     * Used when the owning entity is being deleted.
     */
    async detachAll(purpose: UploadPurpose, ownerId: string): Promise<void> {
        return this.uploadService.detachAll(purpose, ownerId);
    }

    /**
     * Delete an old file when its owner is removed or it's replaced.
     */
    async delete(key: string): Promise<void> {
        await this.uploadService.deleteByKey(key);
    }

    /**
     * Delete uploads that were never attached and are older than the retention window.
     */
    async cleanupOrphans(retentionDays: number): Promise<number> {
        return this.uploadService.cleanupOrphans(retentionDays);
    }
}
