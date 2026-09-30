import { AllPermissions, DEFAULT_SIGNUP_ROLE, Permissions } from "../../../src/modules/rbac";
import { RoleSeedData } from "../seeders/role.seeder";

const all = (): string[] => AllPermissions.map((p) => p.key);

/**
 * Every permission belonging to the given resources.
 * Keeps a role in sync automatically as new permissions are added to a resource.
 */
const group = (...resources: string[]): string[] =>
    AllPermissions.filter((p) => resources.includes(p.resource)).map((p) => p.key);

/**
 * Keys for the platform admins who oversee the app (Admin, System), never for end users
 * such as teachers, assistants, and students.
 */
const ADMIN_ONLY: string[] = [Permissions.StudyGroup.READ_ALL.key];

/**
 * Drop the admin-only keys, so an end-user role that takes a whole resource with group()
 * doesn't pick them up.
 */
const endUser = (keys: string[]): string[] => keys.filter((key) => !ADMIN_ONLY.includes(key));

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
        permissions: [Permissions.User.READ.key, Permissions.Upload.READ.key, Permissions.AuditLog.READ.key],
    },
    {
        name: "Teacher",
        description: "Owns study groups: schedules sessions, sets material, marks attendance, and bills students.",
        isSystem: false,
        permissions: endUser(
            group("study-group", "enrollment", "study-session", "attendance", "study-material", "invoice", "payment"),
        ),
    },
    {
        name: "Teaching Assistant",
        description: "Helps run the study groups a teacher adds them to: manages sessions and material.",
        isSystem: false,
        permissions: [
            Permissions.StudyGroup.READ.key,
            Permissions.StudyGroup.ASSIST.key,
            Permissions.Enrollment.READ.key,
            Permissions.StudyMaterial.READ.key,
            Permissions.StudyMaterial.CREATE.key,
            Permissions.StudyMaterial.UPDATE.key,
            Permissions.StudyMaterial.DELETE.key,
            Permissions.StudySession.READ.key,
            Permissions.StudySession.CREATE.key,
            Permissions.StudySession.UPDATE.key,
            Permissions.StudySession.DELETE.key,
            Permissions.StudySession.APPROVE.key,
        ],
    },
    {
        name: DEFAULT_SIGNUP_ROLE,
        description:
            "Attends study groups: sees their own schedule, material, attendance, and invoices, and submits work.",
        isSystem: false,
        permissions: [
            Permissions.StudyGroup.READ.key,
            Permissions.StudyGroup.JOIN.key,
            Permissions.Enrollment.READ.key,
            Permissions.StudySession.READ.key,
            Permissions.StudySession.ATTEND.key,
            Permissions.Attendance.READ.key,
            Permissions.StudyMaterial.READ.key,
            Permissions.StudyMaterial.SUBMIT.key,
            Permissions.Invoice.READ.key,
            Permissions.Payment.READ.key,
        ],
    },
];
