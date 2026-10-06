-- Hand-edited. Prisma reads the ClassSession -> StudySession rename as
-- "drop class_sessions, create study_sessions", which would delete every session
-- together with its attendance and invoice links. The statements below rename the
-- table, enum, columns, keys and indexes in place instead, so all rows are kept.

-- RenameEnum
ALTER TYPE "ClassSessionStatus" RENAME TO "StudySessionStatus";

-- RenameTable
ALTER TABLE "class_sessions" RENAME TO "study_sessions";

-- RenameColumn
ALTER TABLE "attendance" RENAME COLUMN "classSessionId" TO "studySessionId";
ALTER TABLE "invoice_lines" RENAME COLUMN "classSessionId" TO "studySessionId";

-- RenamePrimaryKey
ALTER TABLE "study_sessions" RENAME CONSTRAINT "class_sessions_pkey" TO "study_sessions_pkey";

-- RenameForeignKey
ALTER TABLE "study_sessions" RENAME CONSTRAINT "class_sessions_studyGroupId_fkey" TO "study_sessions_studyGroupId_fkey";
ALTER TABLE "attendance" RENAME CONSTRAINT "attendance_classSessionId_fkey" TO "attendance_studySessionId_fkey";
ALTER TABLE "invoice_lines" RENAME CONSTRAINT "invoice_lines_classSessionId_fkey" TO "invoice_lines_studySessionId_fkey";

-- RenameIndex
ALTER INDEX "class_sessions_studyGroupId_startsAt_idx" RENAME TO "study_sessions_studyGroupId_startsAt_idx";
ALTER INDEX "class_sessions_status_idx" RENAME TO "study_sessions_status_idx";
ALTER INDEX "attendance_classSessionId_enrollmentId_key" RENAME TO "attendance_studySessionId_enrollmentId_key";
ALTER INDEX "invoice_lines_invoiceId_classSessionId_key" RENAME TO "invoice_lines_invoiceId_studySessionId_key";

-- CreateEnum
CREATE TYPE "JoinRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AttendRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- AlterTable
-- A required column can't be added to a table that already has rows: add it,
-- give existing groups a code (owners can reset it later), then make it required.
ALTER TABLE "study_groups" ADD COLUMN "joinCode" TEXT;
UPDATE "study_groups" SET "joinCode" = upper(substr(md5(random()::text || "id"), 1, 8));
ALTER TABLE "study_groups" ALTER COLUMN "joinCode" SET NOT NULL;

-- CreateTable
CREATE TABLE "study_group_assistants" (
    "id" TEXT NOT NULL,
    "studyGroupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,

    CONSTRAINT "study_group_assistants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "study_group_join_requests" (
    "id" TEXT NOT NULL,
    "studyGroupId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "status" "JoinRequestStatus" NOT NULL DEFAULT 'PENDING',
    "message" TEXT,
    "decidedAt" TIMESTAMP(3),
    "decidedBy" TEXT,
    "decisionNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "study_group_join_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "study_session_attend_requests" (
    "id" TEXT NOT NULL,
    "studySessionId" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "status" "AttendRequestStatus" NOT NULL DEFAULT 'PENDING',
    "message" TEXT,
    "decidedAt" TIMESTAMP(3),
    "decidedBy" TEXT,
    "decisionNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "study_session_attend_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "study_groups_joinCode_key" ON "study_groups"("joinCode");

-- CreateIndex
CREATE INDEX "study_group_assistants_userId_idx" ON "study_group_assistants"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "study_group_assistants_studyGroupId_userId_key" ON "study_group_assistants"("studyGroupId", "userId");

-- CreateIndex
CREATE INDEX "study_group_join_requests_studyGroupId_status_idx" ON "study_group_join_requests"("studyGroupId", "status");

-- CreateIndex
CREATE INDEX "study_group_join_requests_studentId_idx" ON "study_group_join_requests"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "study_group_join_requests_studyGroupId_studentId_key" ON "study_group_join_requests"("studyGroupId", "studentId");

-- CreateIndex
CREATE INDEX "study_session_attend_requests_enrollmentId_status_idx" ON "study_session_attend_requests"("enrollmentId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "study_session_attend_requests_studySessionId_enrollmentId_key" ON "study_session_attend_requests"("studySessionId", "enrollmentId");

-- AddForeignKey
ALTER TABLE "study_group_assistants" ADD CONSTRAINT "study_group_assistants_studyGroupId_fkey" FOREIGN KEY ("studyGroupId") REFERENCES "study_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "study_group_assistants" ADD CONSTRAINT "study_group_assistants_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "study_group_join_requests" ADD CONSTRAINT "study_group_join_requests_studyGroupId_fkey" FOREIGN KEY ("studyGroupId") REFERENCES "study_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "study_group_join_requests" ADD CONSTRAINT "study_group_join_requests_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "study_session_attend_requests" ADD CONSTRAINT "study_session_attend_requests_studySessionId_fkey" FOREIGN KEY ("studySessionId") REFERENCES "study_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "study_session_attend_requests" ADD CONSTRAINT "study_session_attend_requests_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "enrollments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenamePermissions
-- Rename the class-session permission rows in place, so roles that already hold
-- them (including roles created through the API) keep them. The seed then fills
-- in the new display names and adds the new study-session permissions.
UPDATE "permissions"
SET "key" = replace("key", 'class-session:', 'study-session:'),
    "resource" = 'study-session'
WHERE "resource" = 'class-session';
