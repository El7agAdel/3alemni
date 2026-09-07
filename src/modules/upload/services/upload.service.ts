import { randomUUID } from "node:crypto";

import { Inject, Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { fileTypeFromBuffer } from "file-type";

import { ErrorCode } from "@common/constants";
import { UploadDeletedEvent } from "@common/events";
import { AppExceptions, DomainExceptions } from "@common/exceptions";
import { AuthenticatedUser, ListQueryOptions, PaginatedResult, QueryOptions } from "@common/interfaces";
import { QueryBuilderUtil } from "@common/utils";
import { Upload } from "@generated/client";
import { LoggingService } from "@infra/logging";
import { STORAGE_PROVIDER, type StorageProvider } from "@infra/storage";

import { MIME_TO_EXTENSION, UPLOAD_PURPOSE_CONFIG, UploadPurpose, UploadQuery } from "../constants";
import { UploadQueryDto } from "../dto/requests";
import { UploadRepository } from "../repositories/upload.repository";

@Injectable()
export class UploadService {
    constructor(
        private readonly logger: LoggingService,
        private readonly emitter: EventEmitter2,
        private readonly uploadRepo: UploadRepository,
        @Inject(STORAGE_PROVIDER) private readonly storage: StorageProvider,
    ) {
        this.logger.setContext(UploadService.name);
    }

    /**
     * What each purpose accepts: the allowed types and the size ceiling.
     */
    listPurposes(): Record<string, { allowedMimeTypes: readonly string[]; maxSizeBytes: number }> {
        return Object.fromEntries(
            Object.entries(UPLOAD_PURPOSE_CONFIG).map(([purpose, config]) => [
                purpose,
                { allowedMimeTypes: config.allowedMimeTypes, maxSizeBytes: config.maxSizeBytes },
            ]),
        );
    }

    /**
     * List all uploaded files with pagination, search, and sorting.
     */
    async list(query: UploadQueryDto): Promise<PaginatedResult<Upload>> {
        const options = this.buildQuery(query);

        return this.uploadRepo.list(options);
    }

    /**
     * Find all uploads with an optional query for internal use.
     */
    async findAll(query?: QueryOptions): Promise<Upload[]> {
        return this.uploadRepo.findAll(query);
    }

    /**
     * Find a file by ID or throw an error.
     */
    async findByIdOrFail(id: string): Promise<Upload> {
        const upload = await this.uploadRepo.findById(id);

        if (!upload) throw AppExceptions.notFound("Upload", id);

        return upload;
    }

    /**
     * Find a file by key.
     */
    async findByKey(key: string): Promise<Upload | null> {
        return this.uploadRepo.findByKey(key);
    }

    /**
     * Upload a file and create a database record for it.
     * Checks the file type and size against the specified purpose.
     */
    async upload(file: Express.Multer.File, purpose: UploadPurpose, userId: string): Promise<Upload> {
        if (!file) throw AppExceptions.badRequest("No file provided");

        const purposeConfig = UPLOAD_PURPOSE_CONFIG[purpose];

        // Check the real file type from its bytes, not the client-supplied header
        const detectedMime = await this.detectMimeType(file.buffer, file.mimetype);

        if (!purposeConfig.allowedMimeTypes.includes(detectedMime)) {
            throw DomainExceptions.business(
                ErrorCode.UPLOAD_INVALID_TYPE,
                "File type is not allowed for this purpose",
                {
                    purpose,
                    detectedType: detectedMime,
                    allowedTypes: purposeConfig.allowedMimeTypes,
                },
            );
        }

        if (file.size > purposeConfig.maxSizeBytes) {
            throw DomainExceptions.business(
                ErrorCode.UPLOAD_SIZE_EXCEEDED,
                "File exceeds the size limit for this purpose",
                {
                    purpose,
                    fileSize: file.size,
                    maxBytes: purposeConfig.maxSizeBytes,
                },
            );
        }

        // Generate a unique, safe key with the correct extension based on the detected MIME type
        const extension = MIME_TO_EXTENSION[detectedMime] || "bin";
        const key = `${purposeConfig.storagePrefix}/${randomUUID()}.${extension}`;

        const result = await this.storage.store(key, file.buffer, detectedMime);

        const upload = await this.uploadRepo.create({
            key: result.key,
            purpose,
            driver: this.storage.driver,
            bucket: this.storage.bucket,
            originalName: file.originalname,
            mimeType: detectedMime,
            size: result.size,
            uploadedBy: userId,
        });

        this.logger.info("File uploaded", {
            uploadId: upload.id,
            key: upload.key,
            purpose,
            size: upload.size,
            userId,
        });

        return upload;
    }

    /**
     * Attach the owner entity id into the upload row for reference.
     * Doesn't reattach if the upload is already attached to the same owner.
     */
    async attach(key: string, ownerId: string): Promise<void> {
        const upload = await this.findByKey(key);

        if (!upload) throw AppExceptions.notFound("Upload", key);

        if (upload.uploadableId === ownerId) return;

        await this.uploadRepo.attach(key, ownerId);

        this.logger.info("Upload attached", {
            key,
            ownerId,
            purpose: upload.purpose,
        });
    }

    /**
     * Delete a file from storage and its database record.
     * Refuses to delete an attached upload - callers must detach first.
     */
    async delete(actor: AuthenticatedUser, id: string): Promise<void> {
        const upload = await this.findByIdOrFail(id);

        if (upload.uploadableId) {
            throw DomainExceptions.resourceInUse(
                "Upload",
                upload.originalName,
                upload.purpose,
                1,
                `it is attached to a ${upload.purpose.toLowerCase()}. Detach it from the owning entity first.`,
            );
        }

        await this.storage.delete(upload.key);
        await this.uploadRepo.delete(id);

        this.emitter.emit(
            UploadDeletedEvent.eventName,
            new UploadDeletedEvent(id, upload.key, upload.purpose, actor.id),
        );

        this.logger.info("File deleted", { uploadId: id, key: upload.key });
    }

    /**
     * Delete a file and its database record using its key.
     */
    async deleteByKey(key: string): Promise<void> {
        const upload = await this.findByKey(key);

        await this.storage.delete(key);

        if (!upload) return;

        await this.uploadRepo.delete(upload.id);

        this.logger.info("File deleted by key", { uploadId: upload.id, key });
    }

    /**
     * Delete every upload owned by the given entity.
     * Used when the owner entity is being deleted.
     */
    async detachAll(purpose: UploadPurpose, ownerId: string): Promise<void> {
        const uploads = await this.uploadRepo.findByOwner(purpose, ownerId);

        if (uploads.length === 0) return;

        for (const upload of uploads) {
            await this.deleteByKey(upload.key);
        }

        this.logger.info("Uploads detached", {
            ownerId,
            purpose,
            count: uploads.length,
        });
    }

    /**
     * Delete uploads that were never attached and are older than the retention window.
     */
    async cleanupOrphans(retentionDays: number): Promise<number> {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - retentionDays);

        const orphans = await this.uploadRepo.findOrphans(cutoff);

        if (orphans.length === 0) return 0;

        for (const orphan of orphans) {
            await this.deleteByKey(orphan.key);
        }

        this.logger.info("Cleaned orphan uploads", {
            count: orphans.length,
            retentionDays,
        });

        return orphans.length;
    }

    /**
     * Read raw file bytes. Can be used to serve files directly from the backend.
     */
    async readFile(key: string): Promise<Buffer> {
        return this.storage.read(key);
    }

    /**
     * Detect the real type of a file by checking its bytes.
     * Falls back to the client-provided MIME type if detection fails.
     */
    private async detectMimeType(buffer: Buffer, clientMime: string): Promise<string> {
        const result = await fileTypeFromBuffer(buffer);

        if (result?.mime) return result.mime;

        return clientMime;
    }

    /**
     * Build query options for uploads listing.
     */
    private buildQuery(query?: UploadQueryDto): ListQueryOptions {
        return QueryBuilderUtil.create()
            .paginate(query)
            .sort(query, UploadQuery.sort)
            .search(query?.search, UploadQuery.search)
            .filter("purpose", query?.purpose)
            .filter("uploadedBy", query?.uploadedBy)
            .build();
    }
}
