import { Injectable } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";

import { RoleCreatedEvent, RoleDeletedEvent, RolePermissionsChangedEvent, RoleUpdatedEvent } from "@common/events";
import { AuditActions, AuditService } from "@shared/audit";

import { RbacPublicService } from "../services";

@Injectable()
export class OnRoleHandler {
    constructor(
        private readonly auditService: AuditService,
        private readonly rbacPublicService: RbacPublicService,
    ) {}

    @OnEvent(RoleCreatedEvent.eventName)
    async handleRoleCreated(event: RoleCreatedEvent): Promise<void> {
        await this.rbacPublicService.invalidateRolesListCache();

        await this.auditService.log({
            actorId: event.createdBy,
            auditAction: AuditActions.ROLE_CREATED,
            resourceId: event.roleId,
            details: { roleName: event.roleName },
        });
    }

    @OnEvent(RoleUpdatedEvent.eventName)
    async handleRoleUpdated(event: RoleUpdatedEvent): Promise<void> {
        await this.rbacPublicService.invalidateRolesListCache();

        await this.auditService.log({
            actorId: event.updatedBy,
            auditAction: AuditActions.ROLE_UPDATED,
            resourceId: event.roleId,
            details: { changes: event.changes },
        });
    }

    @OnEvent(RoleDeletedEvent.eventName)
    async handleRoleDeleted(event: RoleDeletedEvent): Promise<void> {
        await this.rbacPublicService.invalidateRolesListCache();

        await this.auditService.log({
            actorId: event.deletedBy,
            auditAction: AuditActions.ROLE_DELETED,
            resourceId: event.roleId,
            details: { roleName: event.roleName },
        });
    }

    @OnEvent(RolePermissionsChangedEvent.eventName)
    async handlePermissionsChanged(event: RolePermissionsChangedEvent): Promise<void> {
        await Promise.all([
            this.rbacPublicService.invalidateRolesListCache(),
            this.rbacPublicService.invalidateUsersWithRoleCache(event.roleId),
        ]);

        await this.auditService.log({
            actorId: event.changedBy,
            auditAction: AuditActions.ROLE_PERMISSIONS_CHANGED,
            resourceId: event.roleId,
            details: { added: event.addedKeys, removed: event.removedKeys },
        });
    }
}
