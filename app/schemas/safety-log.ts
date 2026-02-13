/**
 * Safety Log Zod Validation Schemas
 *
 * Server-side and client-side validation for all 12 safety log types.
 * Each log type has a specific form-data schema; the base schema wraps
 * shared fields (location, log_type, submitted_by).
 */

import { z } from 'zod'

// ── Shared Enums ───────────────────────────────────────

export const SafetyLogTypeEnum = z.enum([
  'training_attendance',
  'injury_illness',
  'incident_near_miss',
  'hazard_assessment',
  'safety_inspection',
  'fire_emergency_drill',
  'sharps_injury',
  'zoonotic_bite_report',
  'radiation_dosimetry',
  'equipment_maintenance',
  'safety_meeting',
  'emergency_contacts',
])

export const SafetyLocationEnum = z.enum(['venice', 'sherman_oaks', 'van_nuys'])

export const SafetyStatusEnum = z.enum(['draft', 'submitted', 'reviewed', 'flagged'])

// ── Per-Type form_data Schemas ─────────────────────────

export const TrainingAttendanceSchema = z.object({
  employee_name: z.string().min(1, 'Employee name is required').transform(s => s.trim()),
  topic: z.string().min(1, 'Training topic is required'),
  training_date: z.string().min(1, 'Training date is required'),
  trainer: z.string().optional().default(''),
  notes: z.string().optional().default(''),
})

export const InjuryIllnessSchema = z.object({
  incident_date: z.string().min(1, 'Incident date is required'),
  incident_location: z.string().min(1, 'Incident location is required').transform(s => s.trim()),
  description: z.string().min(1, 'Description is required').transform(s => s.trim()),
  treatment: z.string().optional().default(''),
  root_cause_analysis: z.string().optional().default(''),
})

export const IncidentNearMissSchema = z.object({
  description: z.string().min(1, 'Description is required').transform(s => s.trim()),
  potential_cause: z.string().optional().default(''),
  animal_involved: z.boolean().default(false),
  corrective_action: z.string().optional().default(''),
})

export const HazardAssessmentSchema = z.object({
  assessor: z.string().min(1, 'Assessor name is required').transform(s => s.trim()),
  area: z.string().min(1, 'Area is required').transform(s => s.trim()),
  hazard_type: z.string().optional().default(''),
  risk_level: z.string().optional().default(''),
  mitigation_plan: z.string().optional().default(''),
})

export const SafetyInspectionSchema = z.object({
  inspector: z.string().min(1, 'Inspector name is required').transform(s => s.trim()),
  checklist_items: z.array(z.string()).default([]),
  findings: z.string().optional().default(''),
})

export const FireEmergencyDrillSchema = z.object({
  drill_type: z.string().min(1, 'Drill type is required'),
  evacuation_time: z.number().optional().nullable(),
  animal_safety_protocol_followed: z.boolean().default(false),
  participants_count: z.number().optional().nullable(),
  notes: z.string().optional().default(''),
})

export const SharpsInjurySchema = z.object({
  device_type: z.string().min(1, 'Device type is required'),
  procedure: z.string().optional().default(''),
  safety_mechanism_used: z.boolean().default(false),
  explanation: z.string().optional().default(''),
})

export const ZoonoticBiteReportSchema = z.object({
  animal_id: z.string().min(1, 'Animal ID is required').transform(s => s.trim()),
  exposure_type: z.string().min(1, 'Exposure type is required'),
  body_part_affected: z.string().optional().default(''),
  post_exposure_protocol_followed: z.boolean().default(false),
  notes: z.string().optional().default(''),
})

export const RadiationDosimetrySchema = z.object({
  badge_id: z.string().min(1, 'Badge ID is required').transform(s => s.trim()),
  period: z.string().min(1, 'Monitoring period is required').transform(s => s.trim()),
  reading: z.number().optional().nullable(),
  ppe_inspection_passed: z.boolean().default(false),
  notes: z.string().optional().default(''),
})

export const EquipmentMaintenanceSchema = z.object({
  equipment_id: z.string().min(1, 'Equipment ID is required').transform(s => s.trim()),
  maintenance_type: z.string().optional().default(''),
  next_service_due: z.string().optional().default(''),
  oxygen_storage_check: z.boolean().default(false),
  anesthetic_leak_check: z.boolean().default(false),
  findings: z.string().optional().default(''),
})

export const SafetyMeetingSchema = z.object({
  topic: z.string().min(1, 'Meeting topic is required').transform(s => s.trim()),
  attendees: z.string().optional().default(''),
  action_items: z.string().optional().default(''),
})

// Map of log_type → form_data schema
export const FORM_DATA_SCHEMAS: Record<string, z.ZodType> = {
  training_attendance: TrainingAttendanceSchema,
  injury_illness: InjuryIllnessSchema,
  incident_near_miss: IncidentNearMissSchema,
  hazard_assessment: HazardAssessmentSchema,
  safety_inspection: SafetyInspectionSchema,
  fire_emergency_drill: FireEmergencyDrillSchema,
  sharps_injury: SharpsInjurySchema,
  zoonotic_bite_report: ZoonoticBiteReportSchema,
  radiation_dosimetry: RadiationDosimetrySchema,
  equipment_maintenance: EquipmentMaintenanceSchema,
  safety_meeting: SafetyMeetingSchema,
}

/**
 * Full insert schema — validates the complete payload before DB insert.
 */
export const SafetyLogInsertSchema = z.object({
  log_type: SafetyLogTypeEnum,
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
 */
export function validateFormData(logType: string, formData: unknown) {
  const schema = FORM_DATA_SCHEMAS[logType]
  if (!schema) {
    return { success: false as const, error: { message: `Unknown log type: ${logType}` } }
  }
  return schema.safeParse(formData)
}
