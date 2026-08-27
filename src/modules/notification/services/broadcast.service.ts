import { Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";

import { BroadcastSentEvent } from "@common/events";
import { AppExceptions, DomainExceptions } from "@common/exceptions";
import { AuthenticatedUser, PaginatedResult } from "@common/interfaces";
import { QueryBuilderUtil } from "@common/utils";
import { ConfigService } from "@config";
import { Broadcast, BroadcastStatus, Prisma } from "@generated/client";
import { LoggingService } from "@infra/logging";

import { AudienceParams, BroadcastAudience, BroadcastQuery, NotificationRouting, NotificationType } from "../constants";
import { BroadcastQueryDto, CreateBroadcastDto } from "../dto/requests";
import { BroadcastProducer } from "../producers/broadcast.producer";
import { BroadcastRepository } from "../repositories";
import { AudienceResolverService } from "../services";

@Injectable()
export class BroadcastService {
    constructor(
        private readonly config: ConfigService,
        private readonly logger: LoggingService,
        private readonly emitter: EventEmitter2,
        private readonly broadcastRepo: BroadcastRepository,
        private readonly audienceResolverService: AudienceResolverService,
        private readonly broadcastProducer: BroadcastProducer,
    ) {
        this.logger.setContext(BroadcastService.name);
    }

    /**
     * List all broadcasts with an optional custom filter.
     */
    async list(query: BroadcastQueryDto): Promise<PaginatedResult<Broadcast>> {
        const options = this.buildBroadcastQuery(query);

        return this.broadcastRepo.list(options);
    }

    /**
     * Find a single broadcast's details, or throw an error if not found.
     */
    async findByIdOrFail(id: string): Promise<Broadcast> {
        const broadcast = await this.broadcastRepo.findById(id);

        if (!broadcast) throw AppExceptions.notFound("Broadcast", id);

        return broadcast;
    }

    /**
     * Create a broadcast entry and queue delivery to the selected audience.
     * Validates the audience size before creating. Returns immediately; delivery runs in the background.
     */
    async create(actor: AuthenticatedUser, dto: CreateBroadcastDto): Promise<Broadcast> {
        const audienceSize = await this.audienceResolverService.count(dto.audience, actor.id, dto.audienceParams);

        if (audienceSize === 0) {
            throw DomainExceptions.audienceEmpty();
        }

        const maxSize = this.config.notification.broadcast.maxAudienceSize;

        if (audienceSize > maxSize) {
            throw DomainExceptions.audienceTooLarge(audienceSize, maxSize);
        }

        const persistAsNotification =
            dto.persistAsNotification ?? NotificationRouting[NotificationType.BROADCAST].persistNotification;

        const broadcast = await this.broadcastRepo.create({
            title: dto.title,
            body: dto.body,
            channel: dto.channel,
            audience: dto.audience,
            ...(dto.audienceParams && {
                audienceParams: dto.audienceParams as Prisma.InputJsonValue,
            }),
            persistAsNotification,
            audienceSize,
            status: BroadcastStatus.SENDING,
            createdBy: actor.id,
        });

        await this.broadcastProducer.produce({ broadcastId: broadcast.id });

        this.emitter.emit(
            BroadcastSentEvent.eventName,
            new BroadcastSentEvent(
                broadcast.id,
                actor.id,
                dto.audience,
                audienceSize,
                dto.channel,
                persistAsNotification,
            ),
        );

        return broadcast;
    }

    /**
     * Return how many recipients an audience would currently match.
     * Used by the admin to show a live counter before sending.
     */
    async previewAudience(
        actor: AuthenticatedUser,
        audience: BroadcastAudience,
        params?: AudienceParams,
    ): Promise<{ audience: string; size: number }> {
        const size = await this.audienceResolverService.count(audience, actor.id, params);

        return { audience, size };
    }

    /**
     * Build query options for listing broadcasts.
     */
    private buildBroadcastQuery(query: BroadcastQueryDto) {
        return QueryBuilderUtil.create()
            .paginate(query)
            .sort(query, BroadcastQuery.sort)
            .filter("channel", query.channel)
            .filter("audience", query.audience)
            .filter("status", query.status)
            .build();
    }
}
