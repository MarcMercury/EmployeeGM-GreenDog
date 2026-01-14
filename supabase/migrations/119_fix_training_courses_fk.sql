-- Migration: 119_fix_training_courses_fk.sql
-- Description: Fix training_courses.created_by FK to reference profiles instead of employees
-- Status: APPLIED

-- The created_by column should reference profiles.id (the logged-in user's profile)
-- not employees.id, since not all admins are necessarily employees

ALTER TABLE training_courses DROP CONSTRAINT IF EXISTS training_courses_created_by_fkey;

ALTER TABLE training_courses 
  ADD CONSTRAINT training_courses_created_by_fkey 
  FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;
