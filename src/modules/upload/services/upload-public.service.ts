import { Injectable } from "@nestjs/common";

import { ErrorCode } from "@common/constants";
import { DomainExceptions } from "@common/exceptions";
import { Upload } from "@generated/client";

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
        await this.findForPurpose(key, purpose);
    }

    /**
     * Confirm that a key can be attached to an owner: it exists, is for the right purpose,
     * and is not attached to anything else yet. Stops one owner taking over another owner's file.
     */
    async validateAttachable(key: string, purpose: UploadPurpose, ownerId?: string): Promise<void> {
        const upload = await this.findForPurpose(key, purpose);

        if (upload.uploadableId && upload.uploadableId !== ownerId) {
            throw DomainExceptions.business(ErrorCode.UPLOAD_ALREADY_ATTACHED, "Upload is already attached elsewhere", {
                key,
            });
        }
    }

    /**
     * The uploads attached to one owner, oldest first.
     */
    async listByOwner(purpose: UploadPurpose, ownerId: string): Promise<Upload[]> {
        return this.uploadRepo.findByOwner(purpose, ownerId);
    }

    /**
     * The uploads attached to several owners in one query, for list pages.
     */
    async listByOwners(purpose: UploadPurpose, ownerIds: string[]): Promise<Upload[]> {
        if (ownerIds.length === 0) return [];

        return this.uploadRepo.findByOwners(purpose, ownerIds);
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

    private async findForPurpose(key: string, purpose: UploadPurpose): Promise<Upload> {
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

        return upload;
    }
}
