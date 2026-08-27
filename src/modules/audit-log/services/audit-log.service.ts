import { Injectable } from "@nestjs/common";

import { AppExceptions } from "@common/exceptions";
import { ListQueryOptions, PaginatedResult } from "@common/interfaces";
import { QueryBuilderUtil } from "@common/utils";
import { AuditLog } from "@generated/client";
import { LoggingService } from "@infra/logging";
import { UserPublicService } from "@modules/user";
import { AuditService } from "@shared/audit";

import { AuditLogQuery } from "../constants/audit-log.constant";
import { AuditLogQueryDto } from "../dto/requests";

export interface EnrichedAuditLog extends AuditLog {
    actor?: {
        id: string;
        username: string;
        email: string;
        phone: string;
        firstName: string | null;
        lastName: string | null;
    } | null;
}

@Injectable()
export class AuditLogService {
    constructor(
        private readonly logger: LoggingService,
        private readonly auditService: AuditService,
        private readonly userPublicService: UserPublicService,
    ) {
        this.logger.setContext(AuditLogService.name);
    }

    /**
     * List audit logs with optional query options and actor details.
     */
    async list(query: AuditLogQueryDto): Promise<PaginatedResult<EnrichedAuditLog>> {
        const options = this.buildQuery(query);
        const result = await this.auditService.list(options);

        const enrichedItems = await this.enrichWithActors(result.items);

        return { items: enrichedItems, meta: result.meta };
    }

    /**
     * Get a single audit log with full details and actor info.
     * Throws an error if not found.
     */
    async findById(id: string): Promise<EnrichedAuditLog> {
        const log = await this.auditService.findById(id);

        if (!log) throw AppExceptions.notFound("AuditLog", id);

        const [enriched] = await this.enrichWithActors([log]);

        return enriched;
    }

    /**
     * Build query options for audit log listing.
     */
    private buildQuery(query: AuditLogQueryDto): ListQueryOptions {
        return QueryBuilderUtil.create()
            .paginate(query)
            .sort(query, AuditLogQuery.sort)
            .search(query.search, AuditLogQuery.search)
            .filter("resource", query.resource)
            .filter("action", query.action)
            .filter("actorId", query.actorId)
            .filter("resourceId", query.resourceId)
            .dateRange("createdAt", query.from, query.to)
            .build();
    }

    /**
     * Add actor information for a list of audit logs.
     * Maps user ids to their retrieved details; tolerates actors that no longer exist.
     */
    private async enrichWithActors(logs: AuditLog[]): Promise<EnrichedAuditLog[]> {
        const actorIds = [...new Set(logs.map((log) => log.actorId).filter(Boolean))] as string[];

        if (actorIds.length === 0) {
            return logs.map((log) => ({ ...log, actor: null }));
        }

        const users = await this.userPublicService.findManyByIds(actorIds);
        const userMap = new Map(users.map((user) => [user.id, user]));

        return logs.map((log) => ({
            ...log,
            actor: log.actorId ? (userMap.get(log.actorId) ?? null) : null,
        }));
    }
}
