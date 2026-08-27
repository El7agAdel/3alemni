import { UserSeedData } from "../seeders/user.seeder";

// Local development accounts only - main.ts skips these when NODE_ENV=production.
// The shared password is "Password123!".
const PASSWORD_HASH =
    "$argon2id$v=19$m=65536,t=3,p=4$dRZ8/++10NKmIvnknWjY1g$Di1tULsUZwsTnqXJ1wAz0NLU0RliaiboG+bqgzchHmE";

export const USERS: UserSeedData[] = [
    {
        username: "root",
        email: "root@example.com",
        phone: "+15550000001",
        passwordHash: PASSWORD_HASH,
        roles: ["System"],
    },
    {
        username: "admin",
        email: "admin@example.com",
        phone: "+15550000002",
        passwordHash: PASSWORD_HASH,
        roles: ["Admin"],
    },
    {
        username: "test-user",
        email: "user@example.com",
        phone: "+15550000003",
        passwordHash: PASSWORD_HASH,
        roles: [],
    },
];
