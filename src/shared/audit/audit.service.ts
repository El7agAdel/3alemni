import { Injectable } from "@nestjs/common";

import { ListQueryOptions, PaginatedResult } from "@common/interfaces";
import { RequestContextService } from "@common/services";
import { AuditLog, Prisma } from "@generated/client";
import { LoggingService } from "@infra/logging";

import { AuditAction } from "./audit.constant";
import { AuditRepository } from "./audit.repository";

export interface AuditLogData {
    actorId?: string;
    auditAction: AuditAction;
    resourceId?: string;
    details?: Record<string, unknown>;
}

@Injectable()
export class AuditService {
    constructor(
        private readonly auditRepo: AuditRepository,
        private readonly logger: LoggingService,
        private readonly requestContext: RequestContextService,
    ) {
        this.logger.setContext(AuditService.name);
    }

    /**
     * List all audit logs with pagination and filtering.
     * Returns raw data without resolving the actor.
     */
    async list(options: ListQueryOptions): Promise<PaginatedResult<AuditLog>> {
        return this.auditRepo.list(options);
    }

    /**
     * Find a single audit log by ID.
     */
    async findById(id: string): Promise<AuditLog | null> {
        return this.auditRepo.findById(id);
    }

    /**
     * Log an audit event.
     * Captures actor/request metadata from the request context when not explicitly provided -
     * request context might not be available in background jobs, so callers can pass actorId explicitly there.
     * Never throws - a logging failure must not break the calling operation.
     */
    async log(data: AuditLogData): Promise<void> {
        try {
            const actorId = data.actorId ?? this.requestContext.get("userId");
            const requestId = this.requestContext.get("requestId");
            const ipAddress = this.requestContext.get("ip");
            const userAgent = this.requestContext.get("userAgent");

            await this.auditRepo.create({
                actorId,
                resource: data.auditAction.resource,
                action: data.auditAction.action,
                resourceId: data.resourceId,
                details: data.details as Prisma.InputJsonValue,
                requestId,
                ipAddress,
                userAgent,
            });

            this.logger.debug("Audit log created", {
                actorId,
                resource: data.auditAction.resource,
                action: data.auditAction.action,
                resourceId: data.resourceId,
            });
        } catch (error) {
            this.logger.error("Failed to create audit log", error, {
                resource: data.auditAction.resource,
                action: data.auditAction.action,
            });
        }
    }
}
