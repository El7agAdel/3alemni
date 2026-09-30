import { Injectable } from "@nestjs/common";

import { AppExceptions, DomainExceptions } from "@common/exceptions";
import { AuthenticatedUser } from "@common/interfaces";
import { Enrollment, StudyGroup } from "@generated/client";

import { GroupRole } from "../constants";
import {
    AssistantRepository,
    EnrollmentRepository,
    StudyGroupRepository,
    StudyGroupWithDetails,
} from "../repositories";

export interface StudyGroupAccess {
    group: StudyGroupWithDetails;
    role: GroupRole;
}

/**
 * The group check: how is a user linked to a study group?
 * Used by every service that works inside a group, in this module and in others.
 */
@Injectable()
export class StudyGroupPublicService {
    constructor(
        private readonly studyGroupRepo: StudyGroupRepository,
        private readonly enrollmentRepo: EnrollmentRepository,
        private readonly assistantRepo: AssistantRepository,
    ) {}

    /**
     * The group and the actor's role in it.
     * Throws 404 when the group is missing, deleted, or the actor is not linked to it,
     * so outsiders can't tell whether a group exists.
     */
    async getAccess(actor: AuthenticatedUser, groupId: string): Promise<StudyGroupAccess> {
        const group = await this.studyGroupRepo.findWithDetails(groupId, actor.id);
        const role = group ? this.resolveRole(actor, group) : null;

        if (!group || !role) throw AppExceptions.notFound("Study group", groupId);

        return { group, role };
    }

    /**
     * The owner or an assistant, else 403.
     */
    async assertStaff(actor: AuthenticatedUser, groupId: string): Promise<StudyGroupWithDetails> {
        const { group, role } = await this.getAccess(actor, groupId);

        if (role === GroupRole.STUDENT) {
            throw AppExceptions.resourceForbidden("study group", "Only the owner or an assistant can do this");
        }

        return group;
    }

    /**
     * The owner only, else 403.
     */
    async assertOwner(actor: AuthenticatedUser, groupId: string): Promise<StudyGroupWithDetails> {
        const { group, role } = await this.getAccess(actor, groupId);

        if (role !== GroupRole.OWNER) {
            throw AppExceptions.resourceForbidden("study group", "Only the owner can do this");
        }

        return group;
    }

    /**
     * The user's ACTIVE enrollment in the group, or null.
     */
    async findActiveEnrollment(groupId: string, userId: string): Promise<Enrollment | null> {
        return this.enrollmentRepo.findActive(groupId, userId);
    }

    /**
     * Block a user who already has a place in the group: the owner, an assistant, or an ACTIVE student.
     * Looks at real links only, so a System user can still be added or join like anyone else.
     */
    async assertNotMember(group: Pick<StudyGroup, "id" | "ownerId">, userId: string): Promise<void> {
        if (group.ownerId === userId) throw DomainExceptions.studyGroupAlreadyMember(GroupRole.OWNER);

        const [assistant, enrollment] = await Promise.all([
            this.assistantRepo.find(group.id, userId),
            this.enrollmentRepo.findActive(group.id, userId),
        ]);

        if (assistant) throw DomainExceptions.studyGroupAlreadyMember(GroupRole.ASSISTANT);
        if (enrollment) throw DomainExceptions.studyGroupAlreadyMember(GroupRole.STUDENT);
    }

    /**
     * The actor's role, from a group loaded for that actor, or null when there is no link.
     * System-role users count as OWNER.
     */
    resolveRole(actor: AuthenticatedUser, group: StudyGroupWithDetails): GroupRole | null {
        if (actor.hasSystemRole || group.ownerId === actor.id) return GroupRole.OWNER;
        if (group.assistants.length > 0) return GroupRole.ASSISTANT;
        if (group.enrollments.length > 0) return GroupRole.STUDENT;

        return null;
    }
}
