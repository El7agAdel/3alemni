import { Injectable } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";

import { UserRoleAssignedEvent, UserRoleRemovedEvent } from "@common/events";
import { AuditActions, AuditService } from "@shared/audit";

import { RbacPublicService } from "../services";

@Injectable()
export class OnUserRoleHandler {
    constructor(
        private readonly auditService: AuditService,
        private readonly rbacPublicService: RbacPublicService,
    ) {}

    @OnEvent(UserRoleAssignedEvent.eventName)
    async handleRoleAssigned(event: UserRoleAssignedEvent): Promise<void> {
        await Promise.all([
            this.rbacPublicService.invalidateUserCache(event.userId),
            this.rbacPublicService.invalidateRolesListCache(),
        ]);

        await this.auditService.log({
            actorId: event.assignedBy,
            auditAction: AuditActions.USER_ROLE_ASSIGNED,
            resourceId: event.userId,
            details: { roleId: event.roleId, roleName: event.roleName },
        });
    }

    @OnEvent(UserRoleRemovedEvent.eventName)
    async handleRoleRemoved(event: UserRoleRemovedEvent): Promise<void> {
        await Promise.all([
            this.rbacPublicService.invalidateUserCache(event.userId),
            this.rbacPublicService.invalidateRolesListCache(),
        ]);

        await this.auditService.log({
            actorId: event.removedBy,
            auditAction: AuditActions.USER_ROLE_REMOVED,
            resourceId: event.userId,
            details: { roleId: event.roleId, roleName: event.roleName },
        });
    }
}
