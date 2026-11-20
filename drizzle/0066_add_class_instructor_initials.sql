-- Instructors show in the planner as initials only (e.g. "JPDC"). The AMIS
-- import reduces each name to initials before anything is saved, so full names
-- never reach this table.
ALTER TABLE "classes" ADD COLUMN IF NOT EXISTS "instructor_initials" text;
