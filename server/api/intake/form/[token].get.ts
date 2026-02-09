/**
 * GET /api/intake/form/[token]
 * 
 * PUBLIC ENDPOINT - Fetches form configuration for a given intake token.
 * This is used by the public intake form to render the appropriate fields.
 * 
 * Returns:
 *   - Form type and configuration
 *   - Prefilled data (if any)
 *   - Target position/department info (if applicable)
 *   - Validation that the link is still valid
 */

import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  const token = getRouterParam(event, 'token')

  if (!token) {
    throw createError({
      statusCode: 400,
      message: 'Token is required'
    })
  }

  // Create anonymous client for public access
  const config = useRuntimeConfig()
  const supabaseUrl = config.public.supabaseUrl
  const supabaseAnonKey = config.public.supabaseKey

  if (!supabaseUrl || !supabaseAnonKey) {
    throw createError({
      statusCode: 500,
      message: 'Server configuration error'
    })
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey)

  // Fetch the intake link
  const { data: link, error } = await supabase
    .from('intake_links')
    .select(`
      id,
      token,
      link_type,
      prefill_email,
      prefill_first_name,
      prefill_last_name,
      status,
      expires_at,
      target_position_id,
      target_department_id,
      target_location_id
    `)
    .eq('token', token)
    .single()

  if (error || !link) {
    throw createError({
      statusCode: 404,
      message: 'Invalid or expired link'
    })
  }

  // Check if link is expired
  if (new Date(link.expires_at) < new Date()) {
    throw createError({
      statusCode: 410,
      message: 'This link has expired'
    })
  }

  // Check if link was already completed
  if (link.status === 'completed') {
    throw createError({
      statusCode: 410,
      message: 'This form has already been submitted'
    })
  }

  // Check if link was revoked
  if (link.status === 'revoked') {
    throw createError({
      statusCode: 410,
      message: 'This link is no longer valid'
    })
  }

  // Mark as opened if first time
  if (link.status === 'pending' || link.status === 'sent') {
    // Use service role to update
    const serviceKey = config.supabaseServiceRoleKey
    if (serviceKey) {
      const adminClient = createClient(supabaseUrl, serviceKey)
      await adminClient
        .from('intake_links')
        .update({
          status: 'opened',
          opened_at: new Date().toISOString()
        })
        .eq('id', link.id)
    }
  }

  // Get additional info for the form
  let positionInfo = null
  let departmentInfo = null
  let locationInfo = null

  if (link.target_position_id || link.target_department_id || link.target_location_id) {
    const serviceKey = config.supabaseServiceRoleKey
    if (serviceKey) {
      const adminClient = createClient(supabaseUrl, serviceKey)
      
      if (link.target_position_id) {
        const { data } = await adminClient
          .from('job_positions')
          .select('id, title, description')
          .eq('id', link.target_position_id)
          .single()
        positionInfo = data
      }

      if (link.target_department_id) {
        const { data } = await adminClient
          .from('departments')
          .select('id, name')
          .eq('id', link.target_department_id)
          .single()
        departmentInfo = data
      }

      if (link.target_location_id) {
        const { data } = await adminClient
          .from('locations')
          .select('id, name, city, state')
          .eq('id', link.target_location_id)
          .single()
        locationInfo = data
      }
    }
  }

  // Define form fields based on link type
  const formConfigs: Record<string, FormConfig> = {
    job_application: {
      title: 'Job Application',
      description: positionInfo 
        ? `Apply for: ${positionInfo.title}`
        : 'Submit your job application',
      sections: [
        {
          title: 'Personal Information',
          fields: [
            { name: 'first_name', label: 'First Name', type: 'text', required: true },
            { name: 'last_name', label: 'Last Name', type: 'text', required: true },
            { name: 'preferred_name', label: 'Preferred Name', type: 'text', required: false },
            { name: 'email', label: 'Email', type: 'email', required: true },
            { name: 'phone_mobile', label: 'Mobile Phone', type: 'tel', required: true },
            { name: 'date_of_birth', label: 'Date of Birth', type: 'date', required: false }
          ]
        },
        {
          title: 'Address',
          fields: [
            { name: 'address_line1', label: 'Street Address', type: 'text', required: false },
            { name: 'address_line2', label: 'Apt/Suite', type: 'text', required: false },
            { name: 'city', label: 'City', type: 'text', required: false },
            { name: 'state', label: 'State', type: 'text', required: false },
            { name: 'postal_code', label: 'ZIP Code', type: 'text', required: false }
          ]
        },
        {
          title: 'Professional Profile',
          fields: [
            { name: 'linkedin_url', label: 'LinkedIn URL', type: 'url', required: false },
            { name: 'resume_url', label: 'Resume', type: 'file', accept: '.pdf,.doc,.docx', required: true },
            { name: 'experience_years', label: 'Years of Experience', type: 'number', required: false },
            { name: 'license_type', label: 'License Type (if applicable)', type: 'select', options: ['None', 'RVT', 'DVM', 'CVT', 'LVT', 'Other'], required: false },
            { name: 'license_number', label: 'License Number', type: 'text', required: false, dependsOn: { field: 'license_type', notEquals: 'None' } }
          ]
        },
        {
          title: 'Work History',
          description: 'List your most recent work experience',
          isRepeatable: true,
          repeatKey: 'work_history',
          maxItems: 5,
          fields: [
            { name: 'employer', label: 'Employer', type: 'text', required: true },
            { name: 'title', label: 'Job Title', type: 'text', required: true },
            { name: 'start_date', label: 'Start Date', type: 'month', required: true },
            { name: 'end_date', label: 'End Date', type: 'month', required: false },
            { name: 'is_current', label: 'Currently employed here', type: 'checkbox', required: false },
            { name: 'responsibilities', label: 'Key Responsibilities', type: 'textarea', required: false }
          ]
        },
        {
          title: 'Emergency Contact',
          fields: [
            { name: 'emergency_contact_name', label: 'Contact Name', type: 'text', required: false },
            { name: 'emergency_contact_phone', label: 'Contact Phone', type: 'tel', required: false },
            { name: 'emergency_contact_relationship', label: 'Relationship', type: 'text', required: false }
          ]
        },
        {
          title: 'Additional Information',
          fields: [
            { name: 'cover_letter', label: 'Cover Letter / Why do you want to work with us?', type: 'textarea', required: false },
            { name: 'availability', label: 'When can you start?', type: 'date', required: false },
            { name: 'referral_source', label: 'How did you hear about us?', type: 'text', required: false }
          ]
        }
      ]
    },
    student_enrollment: {
      title: 'Student Enrollment',
      description: 'Enroll in our education program',
      sections: [
        {
          title: 'Personal Information',
          fields: [
            { name: 'first_name', label: 'First Name', type: 'text', required: true },
            { name: 'last_name', label: 'Last Name', type: 'text', required: true },
            { name: 'preferred_name', label: 'Preferred Name', type: 'text', required: false },
            { name: 'email', label: 'Email', type: 'email', required: true },
            { name: 'phone_mobile', label: 'Mobile Phone', type: 'tel', required: true }
          ]
        },
        {
          title: 'Education Information',
          fields: [
            { name: 'school_of_origin', label: 'School/University', type: 'text', required: true },
            { name: 'program_name', label: 'Program of Study', type: 'text', required: true },
            { name: 'expected_graduation', label: 'Expected Graduation Date', type: 'month', required: false },
            { name: 'current_year', label: 'Current Year', type: 'select', options: ['1st Year', '2nd Year', '3rd Year', '4th Year', 'Graduate'], required: false }
          ]
        },
        {
          title: 'Program Details',
          fields: [
            { name: 'start_date', label: 'Preferred Start Date', type: 'date', required: true },
            { name: 'end_date', label: 'Preferred End Date', type: 'date', required: false },
            { name: 'hours_per_week', label: 'Hours Available Per Week', type: 'number', required: false }
          ]
        },
        {
          title: 'Goals & Interests',
          fields: [
            { name: 'externship_goals', label: 'What do you hope to learn?', type: 'textarea', required: true },
            { name: 'areas_of_interest', label: 'Areas of Interest', type: 'multiselect', options: ['Surgery', 'Dentistry', 'Emergency Medicine', 'Internal Medicine', 'Radiology', 'Laboratory', 'Client Services'], required: false },
            { name: 'prior_experience', label: 'Prior Veterinary Experience', type: 'textarea', required: false }
          ]
        },
        {
          title: 'Emergency Contact',
          fields: [
            { name: 'emergency_contact_name', label: 'Contact Name', type: 'text', required: true },
            { name: 'emergency_contact_phone', label: 'Contact Phone', type: 'tel', required: true },
            { name: 'emergency_contact_relationship', label: 'Relationship', type: 'text', required: false }
          ]
        }
      ]
    },
    externship_signup: {
      title: 'Externship Application',
      description: 'Apply for an externship position',
      sections: [
        {
          title: 'Personal Information',
          fields: [
            { name: 'first_name', label: 'First Name', type: 'text', required: true },
            { name: 'last_name', label: 'Last Name', type: 'text', required: true },
            { name: 'email', label: 'Email', type: 'email', required: true },
            { name: 'phone_mobile', label: 'Mobile Phone', type: 'tel', required: true }
          ]
        },
        {
          title: 'Academic Information',
          fields: [
            { name: 'school_of_origin', label: 'Veterinary School', type: 'text', required: true },
            { name: 'program_name', label: 'Program', type: 'select', options: ['DVM', 'Veterinary Technology', 'Veterinary Assistant', 'Pre-Vet', 'Other'], required: true },
            { name: 'expected_graduation', label: 'Expected Graduation', type: 'month', required: true },
            { name: 'gpa', label: 'Current GPA', type: 'number', step: '0.01', min: 0, max: 4, required: false }
          ]
        },
        {
          title: 'Externship Preferences',
          fields: [
            { name: 'start_date', label: 'Preferred Start Date', type: 'date', required: true },
            { name: 'end_date', label: 'Preferred End Date', type: 'date', required: true },
            { name: 'schedule_preference', label: 'Schedule Preference', type: 'select', options: ['Full-time (40 hrs/week)', 'Part-time (20 hrs/week)', 'Flexible'], required: true }
          ]
        },
        {
          title: 'Goals',
          fields: [
            { name: 'externship_goals', label: 'What are your goals for this externship?', type: 'textarea', required: true },
            { name: 'specialty_interests', label: 'Areas of specialty interest', type: 'multiselect', options: ['Dental Surgery', 'Oral Surgery', 'Anesthesia', 'Radiology', 'Client Communication', 'Practice Management'], required: false },
            { name: 'career_goals', label: 'Long-term career goals', type: 'textarea', required: false }
          ]
        }
      ]
    },
    general_intake: {
      title: 'Contact Us',
      description: 'Get in touch with our team',
      sections: [
        {
          title: 'Your Information',
          fields: [
            { name: 'first_name', label: 'First Name', type: 'text', required: true },
            { name: 'last_name', label: 'Last Name', type: 'text', required: true },
            { name: 'email', label: 'Email', type: 'email', required: true },
            { name: 'phone_mobile', label: 'Phone', type: 'tel', required: false },
            { name: 'company', label: 'Company/Organization', type: 'text', required: false }
          ]
        },
        {
          title: 'Your Message',
          fields: [
            { name: 'subject', label: 'Subject', type: 'select', options: ['General Inquiry', 'Partnership', 'Career Information', 'Education Programs', 'Other'], required: true },
            { name: 'message', label: 'Message', type: 'textarea', required: true }
          ]
        }
      ]
    },
    referral_partner: {
      title: 'Partner Registration',
      description: 'Register as a referral partner',
      sections: [
        {
          title: 'Organization Information',
          fields: [
            { name: 'company', label: 'Organization Name', type: 'text', required: true },
            { name: 'website', label: 'Website', type: 'url', required: false }
          ]
        },
        {
          title: 'Contact Person',
          fields: [
            { name: 'first_name', label: 'First Name', type: 'text', required: true },
            { name: 'last_name', label: 'Last Name', type: 'text', required: true },
            { name: 'email', label: 'Email', type: 'email', required: true },
            { name: 'phone_mobile', label: 'Phone', type: 'tel', required: true },
            { name: 'title', label: 'Job Title', type: 'text', required: false }
          ]
        },
        {
          title: 'Partnership Details',
          fields: [
            { name: 'partnership_interest', label: 'Partnership Interest', type: 'multiselect', options: ['Referrals', 'CE Events', 'Student Placement', 'Product Partnership', 'Other'], required: true },
            { name: 'notes', label: 'Additional Information', type: 'textarea', required: false }
          ]
        }
      ]
    },
    event_registration: {
      title: 'Event Registration',
      description: 'Register for an event',
      sections: [
        {
          title: 'Attendee Information',
          fields: [
            { name: 'first_name', label: 'First Name', type: 'text', required: true },
            { name: 'last_name', label: 'Last Name', type: 'text', required: true },
            { name: 'email', label: 'Email', type: 'email', required: true },
            { name: 'phone_mobile', label: 'Phone', type: 'tel', required: false }
          ]
        },
        {
          title: 'Professional Information',
          fields: [
            { name: 'license_type', label: 'License Type', type: 'select', options: ['DVM', 'RVT', 'CVT', 'LVT', 'None', 'Other'], required: false },
            { name: 'license_number', label: 'License Number', type: 'text', required: false },
            { name: 'employer', label: 'Practice/Employer', type: 'text', required: false }
          ]
        },
        {
          title: 'Registration Details',
          fields: [
            { name: 'dietary_restrictions', label: 'Dietary Restrictions', type: 'text', required: false },
            { name: 'accessibility_needs', label: 'Accessibility Needs', type: 'textarea', required: false }
          ]
        }
      ]
    }
  }

  const formConfig = formConfigs[link.link_type] || formConfigs.general_intake

  return {
    success: true,
    data: {
      token: link.token,
      linkType: link.link_type,
      expiresAt: link.expires_at,
      form: formConfig,
      prefill: {
        email: link.prefill_email,
        first_name: link.prefill_first_name,
        last_name: link.prefill_last_name
      },
      target: {
        position: positionInfo,
        department: departmentInfo,
        location: locationInfo
      }
    }
  }
})

// Type definitions for form config
interface FormField {
  name: string
  label: string
  type: string
  required: boolean
  options?: string[]
  accept?: string
  step?: string
  min?: number
  max?: number
  dependsOn?: {
    field: string
    notEquals?: string
    equals?: string
  }
}

interface FormSection {
  title: string
  description?: string
  fields: FormField[]
  isRepeatable?: boolean
  repeatKey?: string
  maxItems?: number
}

interface FormConfig {
  title: string
  description: string
  sections: FormSection[]
}
