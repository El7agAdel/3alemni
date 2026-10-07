import { Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";

import { StudyMaterialDeletedEvent } from "@common/events";
import { AppExceptions, DomainExceptions } from "@common/exceptions";
import { AuthenticatedUser, PaginatedResult } from "@common/interfaces";
import { QueryBuilderUtil } from "@common/utils";
import { StudyGroupStatus, StudyMaterial, StudyMaterialType, Upload } from "@generated/client";
import { LoggingService } from "@infra/logging";
import { GroupRole, StudyGroupPublicService } from "@modules/study-group";
import { UploadPublicService, UploadPurpose } from "@modules/upload";

import { SCORED_MATERIAL_TYPES, StudyMaterialQuery } from "../constants";
import { CreateStudyMaterialDto, StudyMaterialQueryDto, UpdateStudyMaterialDto } from "../dto/requests";
import { StudyMaterialRepository } from "../repositories";

export type StudyMaterialView = StudyMaterial & { attachments: Upload[] };

@Injectable()
export class StudyMaterialService {
    constructor(
        private readonly logger: LoggingService,
        private readonly emitter: EventEmitter2,
        private readonly studyMaterialRepo: StudyMaterialRepository,
        private readonly studyGroupPublicService: StudyGroupPublicService,
        private readonly uploadPublicService: UploadPublicService,
    ) {
        this.logger.setContext(StudyMaterialService.name);
    }

    /**
     * The group's material. Staff see drafts too; students only see published material.
     */
    async list(
        actor: AuthenticatedUser,
        groupId: string,
        query: StudyMaterialQueryDto,
    ): Promise<PaginatedResult<StudyMaterialView>> {
        const { role } = await this.studyGroupPublicService.getAccess(actor, groupId);

        const builder = QueryBuilderUtil.create()
            .paginate(query)
            .sort(query, StudyMaterialQuery.sort)
            .search(query.search, StudyMaterialQuery.search)
            .filter("type", query.type)
            .where({ studyGroupId: groupId });

        if (role === GroupRole.STUDENT) {
            builder.where(this.publishedOnly());
        } else if (query.published !== undefined) {
            builder.where(query.published ? this.publishedOnly() : { publishedAt: null });
        }

        const result = await this.studyMaterialRepo.list(builder.build());

        return { items: await this.withAttachments(result.items), meta: result.meta };
    }

    /**
     * One piece of material. A draft is 404 for students, as if it did not exist.
     */
    async findOne(actor: AuthenticatedUser, groupId: string, id: string): Promise<StudyMaterialView> {
        const { role } = await this.studyGroupPublicService.getAccess(actor, groupId);

        const material = await this.findInGroup(groupId, id, role === GroupRole.STUDENT);

        return this.view(material);
    }

    /**
     * Add material as a draft. Staff only, and not in an archived group.
     */
    async create(actor: AuthenticatedUser, groupId: string, dto: CreateStudyMaterialDto): Promise<StudyMaterialView> {
        const group = await this.studyGroupPublicService.assertStaff(actor, groupId);

        this.assertNotArchived(group.status);
        this.assertScoreAllowed(dto.type, dto.maxScore);

        // Check every file before writing anything, so a bad key leaves nothing half-created
        const keys = dto.attachments ?? [];
        await this.assertAttachable(keys);

        const material = await this.studyMaterialRepo.create({
            studyGroupId: groupId,
            name: dto.name,
            type: dto.type,
            description: dto.description,
            maxScore: dto.maxScore,
            externalUrl: dto.externalUrl,
            position: dto.position,
            dueAt: this.toDate(dto.dueAt),
            createdBy: actor.id,
        });

        for (const key of keys) await this.uploadPublicService.attach(key, material.id);

        this.logger.info("Study material created", { studyMaterialId: material.id, studyGroupId: groupId });

        return this.view(material);
    }

    /**
     * Update material. Sending `attachments` replaces the whole list. Staff only, not in an archived group.
     */
    async update(
        actor: AuthenticatedUser,
        groupId: string,
        id: string,
        dto: UpdateStudyMaterialDto,
    ): Promise<StudyMaterialView> {
        const group = await this.studyGroupPublicService.assertStaff(actor, groupId);

        this.assertNotArchived(group.status);

        const material = await this.findInGroup(groupId, id);

        // Check the result, not the request: changing the type alone can make an old maxScore invalid
        this.assertScoreAllowed(
            dto.type ?? material.type,
            dto.maxScore !== undefined ? dto.maxScore : material.maxScore,
        );

        if (dto.attachments) await this.syncAttachments(id, dto.attachments);

        const updated = await this.studyMaterialRepo.update(id, {
            name: dto.name,
            type: dto.type,
            description: dto.description,
            maxScore: dto.maxScore,
            externalUrl: dto.externalUrl,
            position: dto.position,
            dueAt: this.toDate(dto.dueAt),
            updatedBy: actor.id,
        });

        this.logger.info("Study material updated", { studyMaterialId: id, changes: dto });

        return this.view(updated);
    }

    /**
     * Show the material to students. Publishing again keeps the first publish date.
     */
    async publish(actor: AuthenticatedUser, groupId: string, id: string): Promise<StudyMaterialView> {
        const material = await this.findEditable(actor, groupId, id);

        if (material.publishedAt) return this.view(material);

        const updated = await this.studyMaterialRepo.update(id, { publishedAt: new Date(), updatedBy: actor.id });

        this.logger.info("Study material published", { studyMaterialId: id });

        return this.view(updated);
    }

    /**
     * Hide the material from students again (back to a draft).
     */
    async unpublish(actor: AuthenticatedUser, groupId: string, id: string): Promise<StudyMaterialView> {
        const material = await this.findEditable(actor, groupId, id);

        if (!material.publishedAt) return this.view(material);

        const updated = await this.studyMaterialRepo.update(id, { publishedAt: null, updatedBy: actor.id });

        this.logger.info("Study material unpublished", { studyMaterialId: id });

        return this.view(updated);
    }

    /**
     * Soft-delete material and delete its files, so their links stop working.
     */
    async delete(actor: AuthenticatedUser, groupId: string, id: string): Promise<void> {
        const material = await this.findEditable(actor, groupId, id);

        await this.studyMaterialRepo.softDelete(id, actor.id);
        await this.uploadPublicService.detachAll(UploadPurpose.STUDY_MATERIAL, id);

        this.emitter.emit(
            StudyMaterialDeletedEvent.eventName,
            new StudyMaterialDeletedEvent(groupId, id, material.name, actor.id),
        );

        this.logger.info("Study material deleted", { studyMaterialId: id, studyGroupId: groupId });
    }

    /**
     * Staff check, archived check, and the material itself.
     */
    private async findEditable(actor: AuthenticatedUser, groupId: string, id: string): Promise<StudyMaterial> {
        const group = await this.studyGroupPublicService.assertStaff(actor, groupId);

        this.assertNotArchived(group.status);

        return this.findInGroup(groupId, id);
    }

    /**
     * The material, only if it belongs to the group in the path (and is published, when asked).
     */
    private async findInGroup(groupId: string, id: string, publishedOnly = false): Promise<StudyMaterial> {
        const material = await this.studyMaterialRepo.findById(id);

        const visible = material?.studyGroupId === groupId && (!publishedOnly || this.isPublished(material));

        if (!material || !visible) throw AppExceptions.notFound("Study material", id);

        return material;
    }

    /**
     * Replace the material's files with `keys`: attach the new ones, delete the ones left out.
     */
    private async syncAttachments(materialId: string, keys: string[]): Promise<void> {
        const current = await this.uploadPublicService.listByOwner(UploadPurpose.STUDY_MATERIAL, materialId);
        const currentKeys = new Set(current.map((upload) => upload.key));

        const added = keys.filter((key) => !currentKeys.has(key));
        const removed = current.filter((upload) => !keys.includes(upload.key));

        await this.assertAttachable(added, materialId);

        for (const key of added) await this.uploadPublicService.attach(key, materialId);
        for (const upload of removed) await this.uploadPublicService.delete(upload.key);
    }

    private async assertAttachable(keys: string[], ownerId?: string): Promise<void> {
        await Promise.all(
            keys.map((key) => this.uploadPublicService.validateAttachable(key, UploadPurpose.STUDY_MATERIAL, ownerId)),
        );
    }

    private assertScoreAllowed(type: StudyMaterialType, maxScore: unknown): void {
        if (maxScore === null || maxScore === undefined || SCORED_MATERIAL_TYPES.includes(type)) return;

        throw AppExceptions.validationFailed({
            maxScore: [`maxScore is only allowed for ${SCORED_MATERIAL_TYPES.join(", ")}. Send null to clear it`],
        });
    }

    private assertNotArchived(status: StudyGroupStatus): void {
        if (status === StudyGroupStatus.ARCHIVED) throw DomainExceptions.studyGroupArchived();
    }

    private publishedOnly(): Record<string, unknown> {
        return { publishedAt: { not: null, lte: new Date() } };
    }

    private isPublished(material: StudyMaterial): boolean {
        return material.publishedAt !== null && material.publishedAt <= new Date();
    }

    private toDate(value: string | null | undefined): Date | null | undefined {
        if (value === undefined || value === null) return value;

        return new Date(value);
    }

    private async view(material: StudyMaterial): Promise<StudyMaterialView> {
        const [view] = await this.withAttachments([material]);

        return view;
    }

    /**
     * Add each item's files, fetched for the whole page in one query.
     */
    private async withAttachments(items: StudyMaterial[]): Promise<StudyMaterialView[]> {
        const uploads = await this.uploadPublicService.listByOwners(
            UploadPurpose.STUDY_MATERIAL,
            items.map((item) => item.id),
        );

        return items.map((item) => ({
            ...item,
            attachments: uploads.filter((upload) => upload.uploadableId === item.id),
        }));
    }
}
