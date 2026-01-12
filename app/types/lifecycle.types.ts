/**
 * Unified User Lifecycle Types
 * 
 * These types support the seamless data flow from
 * Visitor → Lead → Applicant/Student → Employee
 */

// Lifecycle stages enum
export type PersonLifecycleStage = 
  | 'visitor'
  | 'lead'
  | 'student'
  | 'applicant'
  | 'hired'
  | 'employee'
  | 'alumni'
  | 'archived'

// Intake link types
export type IntakeLinkType =
  | 'job_application'
  | 'student_enrollment'
  | 'externship_signup'
  | 'general_intake'
  | 'referral_partner'
  | 'event_registration'

// Intake link status
export type IntakeLinkStatus =
  | 'pending'
  | 'sent'
  | 'opened'
  | 'completed'
  | 'expired'
  | 'revoked'

// Processing status for submissions
export type IntakeProcessingStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'needs_review'

// Extended data types
export type ExtendedDataType =
  | 'education'
  | 'work_history'
  | 'certifications'
  | 'licenses'
  | 'skills'
  | 'externship_goals'
  | 'interview_notes'
  | 'application_data'
  | 'enrollment_data'
  | 'onboarding_progress'
  | 'custom'

/**
 * Core Identity - "Universal DNA"
 * These fields are standardized across all lifecycle stages
 */
export interface CoreIdentity {
  // Name
  firstName: string
  lastName: string
  preferredName?: string
  
  // Primary Contact
  email: string
  emailSecondary?: string
  phoneMobile?: string
  phoneHome?: string
  phoneWork?: string
  
  // Address
  addressLine1?: string
  addressLine2?: string
  city?: string
  state?: string
  postalCode?: string
  country?: string
  
  // Demographics
  dateOfBirth?: string
  gender?: string
  pronouns?: string
  
  // Emergency Contact
  emergencyContactName?: string
  emergencyContactPhone?: string
  emergencyContactRelationship?: string
  emergencyContactEmail?: string
  
  // Digital Identity
  avatarUrl?: string
  linkedinUrl?: string
  websiteUrl?: string
}

/**
 * Unified Person record
 */
export interface UnifiedPerson extends CoreIdentity {
  id: string
  
  // Lifecycle tracking
  currentStage: PersonLifecycleStage
  stageEnteredAt: string
  
  // Source tracking
  sourceType?: string
  sourceDetail?: string
  referralSource?: string
  utmSource?: string
  utmMedium?: string
  utmCampaign?: string
  
  // Linked records
  profileId?: string
  employeeId?: string
  candidateId?: string
  marketingLeadId?: string
  educationVisitorId?: string
  
  // Flags
  isActive: boolean
  doNotContact: boolean
  emailVerified: boolean
  phoneVerified: boolean
  
  // Metadata
  createdAt: string
  updatedAt: string
  createdBy?: string
  lastActivityAt: string
}

/**
 * Extended person view with related data
 */
export interface UnifiedPersonView extends UnifiedPerson {
  // Candidate details
  candidateStatus?: string
  resumeUrl?: string
  targetPositionId?: string
  targetPositionTitle?: string
  
  // Employee details
  employeeNumber?: string
  employmentStatus?: string
  hireDate?: string
  currentPositionTitle?: string
  departmentName?: string
  locationName?: string
  
  // Student details
  studentType?: string
  programName?: string
  schoolOfOrigin?: string
  visitStartDate?: string
  visitEndDate?: string
}

/**
 * Person extended data record
 */
export interface PersonExtendedData {
  id: string
  personId: string
  dataType: ExtendedDataType
  data: Record<string, unknown>
  version: number
  isCurrent: boolean
  createdAt: string
  updatedAt: string
  createdBy?: string
}

/**
 * Intake link record
 */
export interface IntakeLink {
  id: string
  token: string
  linkType: IntakeLinkType
  
  // Prefill data
  prefillEmail?: string
  prefillFirstName?: string
  prefillLastName?: string
  
  // Target references
  targetPositionId?: string
  targetDepartmentId?: string
  targetLocationId?: string
  targetEventId?: string
  
  // Status
  status: IntakeLinkStatus
  expiresAt: string
  
  // Usage tracking
  sentAt?: string
  sentBy?: string
  openedAt?: string
  completedAt?: string
  ipAddressCompleted?: string
  userAgentCompleted?: string
  
  // Result
  resultingPersonId?: string
  
  // Notes
  internalNotes?: string
  
  // Metadata
  createdAt: string
  createdBy?: string
  
  // Computed (from API)
  url?: string
  isExpired?: boolean
}

/**
 * Intake submission record
 */
export interface IntakeSubmission {
  id: string
  intakeLinkId: string
  formData: Record<string, unknown>
  
  // Processing
  processingStatus: IntakeProcessingStatus
  processingError?: string
  processedAt?: string
  
  // Result
  resultingPersonId?: string
  
  // Duplicate detection
  isDuplicate: boolean
  duplicateOfPersonId?: string
  
  // Files
  uploadedFiles: Array<{
    name: string
    url: string
    type: string
    size: number
  }>
  
  // Metadata
  ipAddress?: string
  userAgent?: string
  submittedAt: string
}

/**
 * Lifecycle transition audit record
 */
export interface LifecycleTransition {
  id: string
  personId: string
  fromStage: PersonLifecycleStage
  toStage: PersonLifecycleStage
  triggeredBy?: string
  triggerType: 'manual' | 'automatic' | 'intake_form' | 'import' | 'api'
  sourceRecordId?: string
  sourceTable?: string
  destinationRecordId?: string
  destinationTable?: string
  notes?: string
  metadata: Record<string, unknown>
  transitionedAt: string
}

/**
 * Form configuration for intake forms
 */
export interface IntakeFormField {
  name: string
  label: string
  type: 'text' | 'email' | 'tel' | 'url' | 'number' | 'date' | 'month' | 'textarea' | 'select' | 'multiselect' | 'checkbox' | 'file'
  required: boolean
  options?: string[]
  accept?: string
  step?: string
  min?: number
  max?: number
  dependsOn?: {
    field: string
    equals?: string
    notEquals?: string
  }
}

export interface IntakeFormSection {
  title: string
  description?: string
  fields: IntakeFormField[]
  isRepeatable?: boolean
  repeatKey?: string
  maxItems?: number
}

export interface IntakeFormConfig {
  title: string
  description: string
  sections: IntakeFormSection[]
}

export interface IntakeFormResponse {
  token: string
  linkType: IntakeLinkType
  expiresAt: string
  form: IntakeFormConfig
  prefill: {
    email?: string
    first_name?: string
    last_name?: string
  }
  target?: {
    position?: { id: string; title: string; description?: string }
    department?: { id: string; name: string }
    location?: { id: string; name: string; city?: string; state?: string }
  }
}

/**
 * Promotion options for each target stage
 */
export interface PromoteToApplicantOptions {
  targetPositionId?: string
  targetDepartmentId?: string
  targetLocationId?: string
  resumeUrl?: string
  notes?: string
}

export interface PromoteToStudentOptions {
  programName: string
  schoolOfOrigin?: string
  visitStartDate?: string
  visitEndDate?: string
  externshipGoals?: Record<string, unknown>
}

export interface PromoteToHiredOptions {
  targetStartDate?: string
}

export interface PromoteToEmployeeOptions {
  employmentType: 'full_time' | 'part_time' | 'contract'
  jobTitleId: string
  startDate: string
  startingWage: number
  payType?: 'hourly' | 'salary'
  departmentId?: string
  locationId?: string
}

export type PromotionOptions = 
  | PromoteToApplicantOptions
  | PromoteToStudentOptions
  | PromoteToHiredOptions
  | PromoteToEmployeeOptions

/**
 * API request/response types
 */
export interface CreateIntakeLinkRequest {
  linkType: IntakeLinkType
  prefillEmail?: string
  prefillFirstName?: string
  prefillLastName?: string
  targetPositionId?: string
  targetDepartmentId?: string
  targetLocationId?: string
  targetEventId?: string
  expiresInDays?: number
  internalNotes?: string
  sendEmail?: boolean
}

export interface CreateIntakeLinkResponse {
  success: boolean
  data: {
    id: string
    token: string
    linkType: IntakeLinkType
    expiresAt: string
    url: string
    prefill: {
      email?: string
      firstName?: string
      lastName?: string
    }
    target?: {
      position?: { id: string; title: string }
      department?: { id: string; name: string }
      location?: { id: string; name: string }
    }
    emailSent: boolean
  }
}

export interface PromotePersonRequest {
  personId: string
  targetStage: 'applicant' | 'student' | 'hired' | 'employee'
  options: PromotionOptions
}

export interface PromotePersonResponse {
  success: boolean
  message: string
  data: {
    candidateId?: string
    educationVisitorId?: string
    employeeId?: string
    person: UnifiedPersonView
  }
}
