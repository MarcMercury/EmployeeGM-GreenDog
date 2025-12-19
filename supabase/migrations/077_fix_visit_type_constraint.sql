-- Migration: 077_fix_visit_type_constraint.sql
-- Description: Update partner_visit_logs visit_type check constraint to match frontend options

-- Drop the existing check constraint
ALTER TABLE public.partner_visit_logs DROP CONSTRAINT IF EXISTS partner_visit_logs_visit_type_check;

-- Add updated check constraint with expanded visit types
ALTER TABLE public.partner_visit_logs 
ADD CONSTRAINT partner_visit_logs_visit_type_check 
CHECK (visit_type IN ('in_person', 'phone', 'video', 'email', 'visit', 'call', 'meeting', 'lunch_and_learn', 'ce_event'));

-- Update any existing data to use consistent naming
UPDATE public.partner_visit_logs SET visit_type = 'visit' WHERE visit_type = 'in_person';
UPDATE public.partner_visit_logs SET visit_type = 'call' WHERE visit_type = 'phone';
UPDATE public.partner_visit_logs SET visit_type = 'meeting' WHERE visit_type = 'video';

-- Update the default value to match frontend
ALTER TABLE public.partner_visit_logs ALTER COLUMN visit_type SET DEFAULT 'visit';
