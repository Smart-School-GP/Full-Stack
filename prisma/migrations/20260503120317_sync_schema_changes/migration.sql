-- CreateTable
CREATE TABLE "announcement_recipients" (
    "announcement_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,

    PRIMARY KEY ("announcement_id", "user_id"),
    FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY ("announcement_id") REFERENCES "announcements" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "curriculum_subjects" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "curriculum_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    FOREIGN KEY ("curriculum_id") REFERENCES "curriculums" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "curriculums" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "grade_level" INTEGER NOT NULL,
    "name" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "parent_id" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "description" TEXT,
    "due_date" DATETIME,
    "paid_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    FOREIGN KEY ("parent_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_announcements" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created_by" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "audience" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'general',
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "expires_at" DATETIME,
    "subject_id" TEXT,
    "room_id" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("room_id") REFERENCES "rooms" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    FOREIGN KEY ("subject_id") REFERENCES "subjects" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    FOREIGN KEY ("created_by") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_announcements" ("audience", "body", "category", "created_at", "created_by", "expires_at", "id", "pinned", "subject_id", "title") SELECT "audience", "body", "category", "created_at", "created_by", "expires_at", "id", "pinned", "subject_id", "title" FROM "announcements";
DROP TABLE "announcements";
ALTER TABLE "new_announcements" RENAME TO "announcements";
CREATE INDEX "announcements_room_id_idx" ON "announcements"("room_id" ASC);
CREATE INDEX "announcements_subject_id_idx" ON "announcements"("subject_id" ASC);
CREATE INDEX "announcements_audience_idx" ON "announcements"("audience" ASC);
CREATE INDEX "announcements_expires_at_idx" ON "announcements"("expires_at" ASC);
CREATE TABLE "new_badge_definitions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon_emoji" TEXT,
    "icon_url" TEXT,
    "color" TEXT,
    "criteria_type" TEXT,
    "criteria_value" REAL,
    "points_value" INTEGER NOT NULL DEFAULT 10,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_badge_definitions" ("color", "created_at", "criteria_type", "criteria_value", "description", "icon_emoji", "icon_url", "id", "is_active", "name", "points_value") SELECT "color", "created_at", "criteria_type", "criteria_value", "description", "icon_emoji", "icon_url", "id", "is_active", "name", "points_value" FROM "badge_definitions";
DROP TABLE "badge_definitions";
ALTER TABLE "new_badge_definitions" RENAME TO "badge_definitions";
CREATE TABLE "new_discussion_boards" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "subject_id" TEXT,
    "room_id" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "is_pinned" BOOLEAN NOT NULL DEFAULT false,
    "is_locked" BOOLEAN NOT NULL DEFAULT false,
    "type" TEXT NOT NULL DEFAULT 'general',
    "created_by" TEXT NOT NULL,
    "target_user_id" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("target_user_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    FOREIGN KEY ("created_by") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY ("room_id") REFERENCES "rooms" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    FOREIGN KEY ("subject_id") REFERENCES "subjects" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_discussion_boards" ("created_at", "created_by", "description", "id", "is_locked", "is_pinned", "room_id", "subject_id", "title", "type") SELECT "created_at", "created_by", "description", "id", "is_locked", "is_pinned", "room_id", "subject_id", "title", "type" FROM "discussion_boards";
DROP TABLE "discussion_boards";
ALTER TABLE "new_discussion_boards" RENAME TO "discussion_boards";
CREATE TABLE "new_learning_paths" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "subject_id" TEXT,
    "curriculum_subject_id" TEXT,
    "teacher_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "order_index" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("teacher_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY ("curriculum_subject_id") REFERENCES "curriculum_subjects" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    FOREIGN KEY ("subject_id") REFERENCES "subjects" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_learning_paths" ("created_at", "description", "id", "is_published", "order_index", "subject_id", "teacher_id", "title") SELECT "created_at", "description", "id", "is_published", "order_index", "subject_id", "teacher_id", "title" FROM "learning_paths";
DROP TABLE "learning_paths";
ALTER TABLE "new_learning_paths" RENAME TO "learning_paths";
CREATE TABLE "new_rooms" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "location" TEXT,
    "capacity" INTEGER,
    "grade_level" INTEGER,
    FOREIGN KEY ("grade_level") REFERENCES "curriculums" ("grade_level") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_rooms" ("capacity", "grade_level", "id", "location", "name") SELECT "capacity", "grade_level", "id", "location", "name" FROM "rooms";
DROP TABLE "rooms";
ALTER TABLE "new_rooms" RENAME TO "rooms";
CREATE TABLE "new_timetable_slots" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "room_id" TEXT,
    "grade_level" INTEGER,
    "subject_id" TEXT,
    "curriculum_subject_id" TEXT,
    "teacher_id" TEXT,
    "period_id" TEXT NOT NULL,
    "day_of_week" INTEGER NOT NULL,
    "effective_from" DATETIME NOT NULL,
    "effective_until" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("period_id") REFERENCES "timetable_periods" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY ("teacher_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    FOREIGN KEY ("curriculum_subject_id") REFERENCES "curriculum_subjects" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY ("subject_id") REFERENCES "subjects" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY ("room_id") REFERENCES "rooms" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_timetable_slots" ("created_at", "day_of_week", "effective_from", "effective_until", "id", "period_id", "room_id", "subject_id", "teacher_id") SELECT "created_at", "day_of_week", "effective_from", "effective_until", "id", "period_id", "room_id", "subject_id", "teacher_id" FROM "timetable_slots";
DROP TABLE "timetable_slots";
ALTER TABLE "new_timetable_slots" RENAME TO "timetable_slots";
CREATE TABLE "new_users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "surname" TEXT,
    "gender" TEXT,
    "grade_level" INTEGER,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "password_reset_token" TEXT,
    "password_reset_expires_at" DATETIME,
    "last_password_change" DATETIME,
    "must_change_password" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_users" ("created_at", "email", "id", "is_active", "last_password_change", "name", "password_hash", "password_reset_expires_at", "password_reset_token", "role") SELECT "created_at", "email", "id", "is_active", "last_password_change", "name", "password_hash", "password_reset_expires_at", "password_reset_token", "role" FROM "users";
DROP TABLE "users";
ALTER TABLE "new_users" RENAME TO "users";
CREATE UNIQUE INDEX "users_email_key" ON "users"("email" ASC);
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "announcement_recipients_user_id_idx" ON "announcement_recipients"("user_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "curriculums_grade_level_key" ON "curriculums"("grade_level" ASC);

