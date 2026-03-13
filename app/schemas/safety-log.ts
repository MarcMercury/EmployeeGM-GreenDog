/**
 * Safety Log Zod Validation Schemas
 *
 * Server-side and client-side validation for all safety log types.
 * Each log type has a specific form-data schema; the base schema wraps
 * shared fields (location, log_type, submitted_by).
 */

import { z } from 'zod'

// ── Shared Enums ───────────────────────────────────────

const SafetyLogTypeEnum = z.enum([
  'training_attendance',
  'injury_incident_bite',
  'safety_inspection',
  'fire_emergency_drill',
  'radiation_dosimetry',
  'equipment_maintenance',
  'safety_meeting',
  'ppe_assessment',
  'employee_acknowledgment',
])

const SafetyLocationEnum = z.enum(['venice', 'sherman_oaks', 'van_nuys'])

const SafetyStatusEnum = z.enum(['draft', 'submitted', 'reviewed', 'flagged'])

// ── Per-Type form_data Schemas ─────────────────────────

const TrainingAttendanceSchema = z.object({
  employee_name: z.string().min(1, 'Employee name is required').transform(s => s.trim()),
  topic: z.string().min(1, 'Training topic is required'),
  training_trigger: z.string().optional().default(''),
  training_date: z.string().min(1, 'Training date is required'),
  trainer: z.string().optional().default(''),
  duration_minutes: z.number().optional().nullable(),
  notes: z.string().optional().default(''),
})

const InjuryIncidentBiteSchema = z.object({
  incident_category: z.string().min(1, 'Incident category is required'),
  incident_date: z.string().min(1, 'Incident date is required'),
  incident_location: z.string().optional().default(''),
  description: z.string().min(1, 'Description is required').transform(s => s.trim()),
  body_part_affected: z.string().optional().default(''),
  animal_involved: z.boolean().default(false),
  animal_id: z.string().optional().default(''),
  exposure_type: z.string().optional().default(''),
  device_type: z.string().optional().default(''),
  safety_mechanism_used: z.boolean().default(false),
  post_exposure_protocol_followed: z.boolean().default(false),
  treatment: z.string().optional().default(''),
  potential_cause: z.string().optional().default(''),
  corrective_action: z.string().optional().default(''),
  notes: z.string().optional().default(''),
})

const SafetyInspectionSchema = z.object({
  inspector: z.string().min(1, 'Inspector name is required').transform(s => s.trim()),
  checklist_items: z.array(z.string()).default([]),
  findings: z.string().optional().default(''),
  photos: z.array(z.string()).optional().default([]),
})

const FireEmergencyDrillSchema = z.object({
  drill_type: z.string().min(1, 'Drill type is required'),
  evacuation_time: z.number().optional().nullable(),
  animal_safety_protocol_followed: z.boolean().default(false),
  participants_count: z.number().optional().nullable(),
  notes: z.string().optional().default(''),
})

const RadiationDosimetrySchema = z.object({
  badge_id: z.string().min(1, 'Badge ID is required').transform(s => s.trim()),
  period: z.string().min(1, 'Monitoring period is required').transform(s => s.trim()),
  reading: z.number().optional().nullable(),
  ppe_inspection_passed: z.boolean().default(false),
  notes: z.string().optional().default(''),
})

const EquipmentMaintenanceSchema = z.object({
  equipment_id: z.string().min(1, 'Equipment ID is required').transform(s => s.trim()),
  maintenance_type: z.string().optional().default(''),
  next_service_due: z.string().optional().default(''),
  oxygen_storage_check: z.boolean().default(false),
  anesthetic_leak_check: z.boolean().default(false),
  findings: z.string().optional().default(''),
})

const SafetyMeetingSchema = z.object({
  topic: z.string().min(1, 'Meeting topic is required').transform(s => s.trim()),
  attendees: z.string().optional().default(''),
  action_items: z.string().optional().default(''),
})

const PpeAssessmentSchema = z.object({
  assessment_type: z.string().min(1, 'Assessment type is required'),
  area_assessed: z.string().min(1, 'Area is required').transform(s => s.trim()),
  ppe_items_checked: z.array(z.string()).default([]),
  condition: z.string().optional().default(''),
  deficiencies_found: z.string().optional().default(''),
  corrective_action: z.string().optional().default(''),
  notes: z.string().optional().default(''),
})

const EmployeeAcknowledgmentSchema = z.object({
  employee_name: z.string().min(1, 'Employee name is required').transform(s => s.trim()),
  acknowledgment_type: z.string().min(1, 'Acknowledgment type is required'),
  sections_reviewed: z.array(z.string()).default([]),
  acknowledgment_date: z.string().min(1, 'Date is required'),
  annual_review_date: z.string().optional().default(''),
  notes: z.string().optional().default(''),
})

// Map of log_type → form_data schema
const FORM_DATA_SCHEMAS: Record<string, z.ZodType> = {
  training_attendance: TrainingAttendanceSchema,
  injury_incident_bite: InjuryIncidentBiteSchema,
  safety_inspection: SafetyInspectionSchema,
  fire_emergency_drill: FireEmergencyDrillSchema,
  radiation_dosimetry: RadiationDosimetrySchema,
  equipment_maintenance: EquipmentMaintenanceSchema,
  safety_meeting: SafetyMeetingSchema,
  ppe_assessment: PpeAssessmentSchema,
  employee_acknowledgment: EmployeeAcknowledgmentSchema,
}

/**
 * Full insert schema — validates the complete payload before DB insert.
 */
export const SafetyLogInsertSchema = z.object({
  log_type: z.string().min(1, 'Log type is required'),
  location: SafetyLocationEnum,
  form_data: z.record(z.unknown()),
  submitted_by: z.string().uuid(),
  osha_recordable: z.boolean().default(false),
  photo_urls: z.array(z.string()).default([]),
  status: SafetyStatusEnum.default('submitted'),
})

/**
 * Update schema — for review / status changes.
 */
export const SafetyLogUpdateSchema = z.object({
  form_data: z.record(z.unknown()).optional(),
  osha_recordable: z.boolean().optional(),
  photo_urls: z.array(z.string()).optional(),
  status: SafetyStatusEnum.optional(),
  reviewed_by: z.string().uuid().optional(),
  reviewed_at: z.string().optional(),
  review_notes: z.string().optional(),
})

/**
 * Validate form_data against its type-specific schema.
 * For custom types (not in FORM_DATA_SCHEMAS), validation is skipped
 * and the data is passed through — UI form rules handle validation.
 */
export function validateFormData(logType: string, formData: unknown) {
  const schema = FORM_DATA_SCHEMAS[logType]
  if (!schema) {
    // Custom type — pass through, UI validates via required field rules
    return { success: true as const, data: formData }
  }
  return schema.safeParse(formData)
}

// ── Custom Type Validation ─────────────────────────────

const VALID_FIELD_TYPES = ['text', 'textarea', 'select', 'boolean', 'date', 'number', 'multiselect', 'file'] as const

/** Schema for a single field definition in a custom safety log type */
const SafetyFormFieldSchema = z.object({
  key: z.string().min(1, 'Field key is required').regex(/^[a-z][a-z0-9_]*$/, 'Field key must be snake_case'),
  label: z.string().min(1, 'Field label is required'),
  type: z.enum(VALID_FIELD_TYPES),
  required: z.boolean().optional(),
  options: z.array(z.string()).optional(),
  placeholder: z.string().optional(),
  hint: z.string().optional(),
  cols: z.number().min(1).max(12).optional(),
})

/** Schema for custom type key — must be snake_case, no collision with built-in types */
const CustomTypeKeySchema = z.string()
  .min(2, 'Key must be at least 2 characters')
  .max(64, 'Key must be at most 64 characters')
  .regex(/^[a-z][a-z0-9_]*$/, 'Key must be lowercase snake_case (letters, numbers, underscores)')

/** Schema for creating a new custom safety log type */
export const CustomSafetyLogTypeCreateSchema = z.object({
  key: CustomTypeKeySchema,
  label: z.string().min(1, 'Label is required').max(100),
  icon: z.string().default('mdi-clipboard-text'),
  color: z.string().default('grey'),
  description: z.string().default(''),
  fields: z.array(SafetyFormFieldSchema).min(1, 'At least one field is required'),
  has_osha_toggle: z.boolean().default(false),
  compliance_standards: z.array(z.string()).default([]),
})

/** Schema for updating a custom safety log type */
export const CustomSafetyLogTypeUpdateSchema = z.object({
  id: z.string().uuid('Valid type ID is required'),
  label: z.string().min(1).max(100).optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
  description: z.string().optional(),
  fields: z.array(SafetyFormFieldSchema).min(1).optional(),
  has_osha_toggle: z.boolean().optional(),
  compliance_standards: z.array(z.string()).optional(),
  is_active: z.boolean().optional(),
})
