import { AllPermissions, Permissions } from "../../../src/modules/rbac";
import { RoleSeedData } from "../seeders/role.seeder";

const all = (): string[] => AllPermissions.map((p) => p.key);

/**
 * Every permission belonging to the given resources.
 * Keeps a role in sync automatically as new permissions are added to a resource.
 */
const group = (...resources: string[]): string[] =>
    AllPermissions.filter((p) => resources.includes(p.resource)).map((p) => p.key);

/**
 * Starter roles. "System" and "Admin" are the two the application itself relies on;
 * the rest are examples of how to compose a role - replace them with your own.
 */
export const ROLES: RoleSeedData[] = [
    {
        name: "System",
        description: "Has full system access. Too much power to be trusted to one person.",
        isSystem: true,
        permissions: all(),
    },
    {
        name: "Admin",
        description: "Has access to most system features. With great power comes great responsibility.",
        isSystem: false,
        permissions: all(),
    },
    {
        name: "User Manager",
        description: "Manages user accounts and the roles assigned to them.",
        isSystem: false,
        permissions: [...group("user"), Permissions.Role.READ.key, Permissions.Role.ASSIGN.key],
    },
    {
        name: "Support",
        description: "Read-only access to users, uploads, and the audit trail.",
        isSystem: false,
        permissions: [
            Permissions.User.READ.key,
            Permissions.Upload.READ.key,
            Permissions.AuditLog.READ.key,
        ],
    },
];
