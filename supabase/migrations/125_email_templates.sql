-- =====================================================
-- Migration 125: Email Templates Table
-- Purpose: Store customizable email templates for all outbound communications
-- =====================================================

-- Create email_templates table
CREATE TABLE IF NOT EXISTS public.email_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

-- Admin full access
CREATE POLICY "Admins can manage email templates" ON public.email_templates
FOR ALL USING (public.is_admin());

-- All authenticated can view active templates
CREATE POLICY "Authenticated can view active templates" ON public.email_templates
FOR SELECT USING (auth.role() = 'authenticated' AND is_active = true);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_templates TO authenticated;

-- Insert default templates
INSERT INTO public.email_templates (id, name, category, subject, body) VALUES
('student_invite', 'Student Invitation', 'GDU Academy', 
 'Welcome to {{program}} at Green Dog Dental',
 '<p>Hello {{first_name}},</p><p>We''re excited to welcome you to the {{program}} program at Green Dog Dental!</p><p>Please click the link below to complete your enrollment:</p><p><a href="{{link}}">Complete Your Enrollment</a></p><p>Your program starts on {{date}}.</p><p>Best regards,<br>Green Dog Dental Academy Team</p>'),

('candidate_application', 'Application Received', 'Recruiting',
 'Application Received - {{position}}',
 '<p>Dear {{first_name}},</p><p>Thank you for applying for the {{position}} position at Green Dog Dental.</p><p>We have received your application and will review it shortly. You can expect to hear from us within 5-7 business days.</p><p>Best regards,<br>Green Dog Dental HR Team</p>'),

('interview_scheduled', 'Interview Scheduled', 'Recruiting',
 'Interview Scheduled - {{position}}',
 '<p>Dear {{first_name}},</p><p>Great news! We''d like to schedule an interview for the {{position}} position.</p><p><strong>Date:</strong> {{date}}<br><strong>Time:</strong> {{time}}<br><strong>Location:</strong> {{location}}</p><p>Please confirm your availability by replying to this email.</p><p>Best regards,<br>Green Dog Dental HR Team</p>'),

('offer_letter', 'Job Offer', 'Recruiting',
 'Job Offer - {{position}} at Green Dog Dental',
 '<p>Dear {{first_name}},</p><p>Congratulations! We are pleased to offer you the position of {{position}} at Green Dog Dental.</p><p>Please review the attached offer letter and respond within 5 business days.</p><p>We look forward to welcoming you to our team!</p><p>Best regards,<br>Green Dog Dental HR Team</p>'),

('time_off_approved', 'Time Off Approved', 'HR',
 'Your Time Off Request Has Been Approved',
 '<p>Hi {{first_name}},</p><p>Your time off request has been approved!</p><p><strong>Dates:</strong> {{start_date}} - {{end_date}}<br><strong>Type:</strong> {{type}}</p><p>Enjoy your time off!</p>'),

('time_off_denied', 'Time Off Denied', 'HR',
 'Your Time Off Request Status',
 '<p>Hi {{first_name}},</p><p>Unfortunately, your time off request for {{start_date}} - {{end_date}} could not be approved at this time.</p><p>Please speak with your manager for more information.</p>'),

('schedule_published', 'Schedule Published', 'Scheduling',
 'Your Schedule for {{week}}',
 '<p>Hi {{first_name}},</p><p>Your schedule for the week of {{week}} has been published.</p><p>Please log in to TeamOS to view your shifts.</p>'),

('password_reset', 'Password Reset', 'System',
 'Reset Your Password',
 '<p>Hi {{first_name}},</p><p>Click the link below to reset your password:</p><p><a href="{{link}}">Reset Password</a></p><p>This link will expire in 24 hours.</p>')

ON CONFLICT (id) DO NOTHING;

-- Mark migration as complete
INSERT INTO supabase_migrations.schema_migrations (version, name, statements_applied)
VALUES ('125', 'email_templates', 1)
ON CONFLICT (version) DO NOTHING;
