/**
 * Safety Log Types
 *
 * Type definitions for the Workplace Safety & Digital Logging module.
 * Supports 12 log types for Cal/OSHA (Title 8), AVMA, and AAHA compliance.
 */

// ── Enums ──────────────────────────────────────────────

export type SafetyLogType =
  | 'training_attendance'
  | 'injury_illness'
  | 'incident_near_miss'
  | 'hazard_assessment'
  | 'safety_inspection'
  | 'fire_emergency_drill'
  | 'sharps_injury'
  | 'zoonotic_bite_report'
  | 'radiation_dosimetry'
  | 'equipment_maintenance'
  | 'safety_meeting'
  | 'emergency_contacts'
  | 'hazcom_chemical'
  | 'ppe_assessment'
  | 'employee_acknowledgment'
  | string // custom types

export type SafetyLogLocation = 'venice' | 'sherman_oaks' | 'van_nuys'

export type SafetyRiskLevel = 'low' | 'medium' | 'high'

export type SafetyLogStatus = 'draft' | 'submitted' | 'reviewed' | 'flagged'

// ── Database Row ───────────────────────────────────────

export interface SafetyLog {
  id: string
  log_type: SafetyLogType
  location: SafetyLogLocation
  form_data: Record<string, unknown>
  submitted_by: string
  submitted_at: string
  osha_recordable: boolean
  photo_urls: string[]
  status: SafetyLogStatus
  reviewed_by: string | null
  reviewed_at: string | null
  review_notes: string | null
  created_at: string
  updated_at: string
  // Joined profile data
  submitter?: { id: string; first_name: string; last_name: string }
  reviewer?: { id: string; first_name: string; last_name: string }
}

export interface SafetyLogInsert {
  log_type: SafetyLogType
  location: SafetyLogLocation
  form_data: Record<string, unknown>
  submitted_by: string
  osha_recordable?: boolean
  photo_urls?: string[]
  status?: SafetyLogStatus
}

export interface SafetyLogUpdate {
  form_data?: Record<string, unknown>
  osha_recordable?: boolean
  photo_urls?: string[]
  status?: SafetyLogStatus
  reviewed_by?: string
  reviewed_at?: string
  review_notes?: string
}

// ── Form Config (drives the dynamic form renderer) ─────

export type SafetyFieldType =
  | 'text'
  | 'textarea'
  | 'select'
  | 'boolean'
  | 'date'
  | 'number'
  | 'multiselect'
  | 'file'

export interface SafetyFormField {
  key: string
  label: string
  type: SafetyFieldType
  required?: boolean
  options?: string[]
  placeholder?: string
  hint?: string
  cols?: number // Vuetify grid cols (default 12)
}

export interface SafetyLogTypeConfig {
  key: SafetyLogType
  label: string
  icon: string
  color: string
  description: string
  fields: SafetyFormField[]
  hasOshaToggle?: boolean
  complianceStandards?: string[]
  isCustom?: boolean
}

// ── Filter / Query ─────────────────────────────────────

export interface SafetyLogFilters {
  log_type?: SafetyLogType | null
  location?: SafetyLogLocation | null
  status?: SafetyLogStatus | null
  osha_recordable?: boolean | null
  date_from?: string | null
  date_to?: string | null
  search?: string | null
}

// ── Constants ──────────────────────────────────────────

export const SAFETY_LOCATIONS: { value: SafetyLogLocation; label: string; address: string }[] = [
  { value: 'venice', label: 'Venice', address: '210 Main St, Venice, CA 90291' },
  { value: 'sherman_oaks', label: 'Sherman Oaks', address: '13907 Ventura Blvd. Ste 101, Sherman Oaks, CA 91423' },
  { value: 'van_nuys', label: 'Van Nuys', address: '14661 Aetna St, Van Nuys, CA 91411' },
]

export const SAFETY_STATUSES: { value: SafetyLogStatus; label: string; color: string; icon: string }[] = [
  { value: 'draft', label: 'Draft', color: 'grey', icon: 'mdi-pencil-outline' },
  { value: 'submitted', label: 'Submitted', color: 'blue', icon: 'mdi-check' },
  { value: 'reviewed', label: 'Reviewed', color: 'success', icon: 'mdi-check-all' },
  { value: 'flagged', label: 'Flagged', color: 'error', icon: 'mdi-flag' },
]

/**
 * Master config for all 12 safety log types.
 * Drives the dynamic form renderer, navigation tiles, and QR routing.
 */
export const SAFETY_LOG_TYPE_CONFIGS: SafetyLogTypeConfig[] = [
  {
    key: 'training_attendance',
    label: 'Training Attendance',
    icon: 'mdi-school',
    color: 'blue',
    description: 'Record employee safety training attendance (IIPP, Fire, Hazcomm, etc.)',
    complianceStandards: ['Cal/OSHA Title 8 §3203'],
    fields: [
      { key: 'employee_name', label: 'Employee Name', type: 'text', required: true, cols: 6 },
      { key: 'topic', label: 'Training Topic', type: 'select', required: true, cols: 6, options: ['IIPP', 'Fire Safety', 'Hazard Communication', 'Bloodborne Pathogens', 'Radiation Safety', 'Emergency Preparedness', 'Workplace Violence Prevention', 'Ergonomics', 'PPE', 'Zoonotic Disease Control', 'Chemical Safety / HazCom', 'Equipment Safety', 'Other'] },
      { key: 'training_trigger', label: 'Training Trigger', type: 'select', cols: 6, options: ['At Hire', 'New Hazard Introduced', 'Procedure / Equipment Change', 'Unsafe Behavior Observed', 'Annual Refresher', 'Regulatory Update', 'Other'] },
      { key: 'training_date', label: 'Training Date', type: 'date', required: true, cols: 6 },
      { key: 'trainer', label: 'Trainer Name', type: 'text', cols: 6 },
      { key: 'duration_minutes', label: 'Duration (minutes)', type: 'number', cols: 6 },
      { key: 'notes', label: 'Notes', type: 'textarea', cols: 12 },
    ],
  },
  {
    key: 'injury_illness',
    label: 'Injury & Illness (OSHA 300)',
    icon: 'mdi-hospital-box',
    color: 'red',
    description: 'Log workplace injuries and illnesses per OSHA 300 Log requirements.',
    hasOshaToggle: true,
    complianceStandards: ['Cal/OSHA Title 8 §14300', 'OSHA 300 Log'],
    fields: [
      { key: 'incident_date', label: 'Incident Date', type: 'date', required: true, cols: 6 },
      { key: 'incident_location', label: 'Incident Location', type: 'text', required: true, cols: 6, placeholder: 'e.g., Surgery Suite, X-Ray Room' },
      { key: 'description', label: 'Description of Injury/Illness', type: 'textarea', required: true, cols: 12 },
      { key: 'treatment', label: 'Treatment Provided', type: 'textarea', cols: 12 },
      { key: 'root_cause_analysis', label: 'Root Cause Analysis', type: 'textarea', cols: 12, hint: 'What contributed to this incident?' },
    ],
  },
  {
    key: 'incident_near_miss',
    label: 'Incident & Near Miss',
    icon: 'mdi-alert-circle',
    color: 'orange',
    description: 'Report incidents or near-miss events for safety trend analysis.',
    complianceStandards: ['Cal/OSHA Title 8 §3203'],
    fields: [
      { key: 'description', label: 'Description', type: 'textarea', required: true, cols: 12 },
      { key: 'potential_cause', label: 'Potential Cause', type: 'textarea', cols: 12 },
      { key: 'animal_involved', label: 'Animal Involved?', type: 'boolean', cols: 6 },
      { key: 'corrective_action', label: 'Corrective Action Taken', type: 'textarea', cols: 12 },
    ],
  },
  {
    key: 'hazard_assessment',
    label: 'Hazard Assessment',
    icon: 'mdi-shield-alert',
    color: 'amber',
    description: 'Document workplace hazard assessments and mitigation plans.',
    complianceStandards: ['Cal/OSHA Title 8 §3203', 'AAHA Safety Standards'],
    fields: [
      { key: 'assessor', label: 'Assessor Name', type: 'text', required: true, cols: 6 },
      { key: 'area', label: 'Area Assessed', type: 'text', required: true, cols: 6 },
      { key: 'hazard_type', label: 'Hazard Type', type: 'select', cols: 6, options: ['Chemical', 'Biological', 'Physical', 'Ergonomic', 'Radiation', 'Electrical', 'Fire', 'Animal Handling', 'Zoonotic Disease', 'Sharps / Needlestick', 'Anesthetic Gas Exposure', 'Other'] },
      { key: 'risk_level', label: 'Risk Level', type: 'select', cols: 6, options: ['Low', 'Medium', 'High'] },
      { key: 'mitigation_plan', label: 'Mitigation Plan', type: 'textarea', cols: 12 },
    ],
  },
  {
    key: 'safety_inspection',
    label: 'Safety Inspection',
    icon: 'mdi-clipboard-check',
    color: 'teal',
    description: 'Complete periodic safety inspections (Fire, PPE, Eye Wash, etc.).',
    complianceStandards: ['Cal/OSHA Title 8 §3203', 'AAHA Facility Standards'],
    fields: [
      { key: 'inspector', label: 'Inspector Name', type: 'text', required: true, cols: 6 },
      { key: 'checklist_items', label: 'Checklist Items', type: 'multiselect', cols: 6, options: ['Fire Extinguishers', 'PPE Availability', 'Eye Wash Station', 'First Aid Kit', 'Exit Signs', 'Emergency Lighting', 'Spill Kit', 'Sharps Containers', 'Ventilation', 'Chemical Storage', 'SDS Accessible', 'Radiation Signage', 'Oxygen Storage', 'Anesthetic Equipment', 'Electrical Panels Clear', 'Smoke Detectors', 'Emergency Exits Clear'] },
      { key: 'findings', label: 'Findings', type: 'textarea', cols: 12 },
      { key: 'photos', label: 'Photo Upload', type: 'file', cols: 12, hint: 'Upload inspection photos' },
    ],
  },
  {
    key: 'fire_emergency_drill',
    label: 'Fire & Emergency Drill',
    icon: 'mdi-fire',
    color: 'deep-orange',
    description: 'Log fire, earthquake, and active threat drills.',
    complianceStandards: ['Cal/OSHA Title 8 §3220', 'AAHA Emergency Preparedness'],
    fields: [
      { key: 'drill_type', label: 'Drill Type', type: 'select', required: true, cols: 6, options: ['Fire', 'Earthquake', 'Active Threat', 'Evacuation', 'Medical Emergency', 'Power Outage', 'Hazardous Material Spill', 'Other'] },
      { key: 'evacuation_time', label: 'Evacuation Time (minutes)', type: 'number', cols: 6, hint: 'Time in minutes for full evacuation' },
      { key: 'animal_safety_protocol_followed', label: 'Animal Safety Protocol Followed?', type: 'boolean', cols: 6 },
      { key: 'participants_count', label: 'Number of Participants', type: 'number', cols: 6 },
      { key: 'notes', label: 'Drill Notes & Observations', type: 'textarea', cols: 12 },
    ],
  },
  {
    key: 'sharps_injury',
    label: 'Sharps Injury',
    icon: 'mdi-needle',
    color: 'red-darken-2',
    description: 'Report needlestick and sharps injuries.',
    complianceStandards: ['Cal/OSHA Title 8 §5193', 'OSHA Bloodborne Pathogens Standard'],
    fields: [
      { key: 'device_type', label: 'Device Type', type: 'select', required: true, cols: 6, options: ['Hypodermic Needle', 'Suture Needle', 'Scalpel', 'Lancet', 'Glass', 'Other'] },
      { key: 'procedure', label: 'Procedure Being Performed', type: 'text', cols: 6 },
      { key: 'safety_mechanism_used', label: 'Safety Mechanism Used?', type: 'boolean', cols: 6 },
      { key: 'explanation', label: 'Explanation / Details', type: 'textarea', cols: 12, hint: 'Include circumstances and follow-up actions' },
    ],
  },
  {
    key: 'zoonotic_bite_report',
    label: 'Zoonotic / Bite Report',
    icon: 'mdi-paw',
    color: 'purple',
    description: 'Report animal bites, scratches, and zoonotic exposure incidents.',
    complianceStandards: ['AVMA Zoonotic Disease Guidelines', 'Cal/OSHA Title 8 §5199'],
    fields: [
      { key: 'animal_id', label: 'Animal ID / Name', type: 'text', required: true, cols: 6 },
      { key: 'exposure_type', label: 'Exposure Type', type: 'select', required: true, cols: 6, options: ['Bite', 'Scratch', 'Splash/Spray', 'Other Contact'] },
      { key: 'body_part_affected', label: 'Body Part Affected', type: 'text', cols: 6 },
      { key: 'post_exposure_protocol_followed', label: 'Post-Exposure Protocol Followed?', type: 'boolean', cols: 6 },
      { key: 'notes', label: 'Additional Details', type: 'textarea', cols: 12 },
    ],
  },
  {
    key: 'radiation_dosimetry',
    label: 'Radiation Dosimetry',
    icon: 'mdi-radioactive',
    color: 'yellow-darken-3',
    description: 'Track radiation badge readings and PPE inspection results.',
    complianceStandards: ['Cal/OSHA Title 8 §5100', 'AVMA Radiation Safety'],
    fields: [
      { key: 'badge_id', label: 'Badge ID', type: 'text', required: true, cols: 6 },
      { key: 'period', label: 'Monitoring Period', type: 'text', required: true, cols: 6, placeholder: 'e.g., Jan 2026, Q1 2026' },
      { key: 'reading', label: 'Reading (mSv)', type: 'number', cols: 6, hint: 'Dose reading in milliSieverts' },
      { key: 'ppe_inspection_passed', label: 'PPE Inspection Passed?', type: 'boolean', cols: 6 },
      { key: 'notes', label: 'Notes', type: 'textarea', cols: 12 },
    ],
  },
  {
    key: 'equipment_maintenance',
    label: 'Equipment Maintenance',
    icon: 'mdi-wrench',
    color: 'blue-grey',
    description: 'Log equipment maintenance, oxygen storage checks, and anesthetic leak tests.',
    complianceStandards: ['AAHA Equipment Standards', 'Cal/OSHA Title 8 §5142'],
    fields: [
      { key: 'equipment_id', label: 'Equipment ID / Name', type: 'text', required: true, cols: 6 },
      { key: 'maintenance_type', label: 'Maintenance Type', type: 'select', cols: 6, options: ['Routine Inspection', 'Calibration', 'Repair', 'Replacement', 'Safety Check', 'Other'] },
      { key: 'next_service_due', label: 'Next Service Due', type: 'date', cols: 6 },
      { key: 'oxygen_storage_check', label: 'Oxygen Storage Check Passed?', type: 'boolean', cols: 6 },
      { key: 'anesthetic_leak_check', label: 'Anesthetic Leak Check Passed?', type: 'boolean', cols: 6 },
      { key: 'findings', label: 'Findings / Work Performed', type: 'textarea', cols: 12 },
    ],
  },
  {
    key: 'safety_meeting',
    label: 'Safety Meeting',
    icon: 'mdi-account-group',
    color: 'indigo',
    description: 'Record safety committee meetings, attendees, and action items.',
    complianceStandards: ['Cal/OSHA Title 8 §3203(a)(4)'],
    fields: [
      { key: 'topic', label: 'Meeting Topic', type: 'text', required: true, cols: 12 },
      { key: 'attendees', label: 'Attendees', type: 'textarea', cols: 12, placeholder: 'Enter attendee names (one per line)', hint: 'List all attendees' },
      { key: 'action_items', label: 'Action Items', type: 'textarea', cols: 12, hint: 'List follow-up tasks and responsible parties' },
    ],
  },
  {
    key: 'emergency_contacts',
    label: 'Emergency Contacts & Shutoffs',
    icon: 'mdi-phone-alert',
    color: 'red-darken-1',
    description: 'Log emergency contacts, utility shutoff locations, and assembly points.',
    complianceStandards: ['Cal/OSHA Title 8 §3220'],
    fields: [
      { key: 'contact_type', label: 'Contact Type', type: 'select', required: true, cols: 6, options: ['Fire Department', 'Police', 'Poison Control', 'Hospital / ER', 'Animal Control', 'Utility Company', 'Building Management', 'Insurance', 'Regulatory Agency', 'Other'] },
      { key: 'name', label: 'Contact Name / Org', type: 'text', required: true, cols: 6 },
      { key: 'phone', label: 'Phone Number', type: 'text', required: true, cols: 6 },
      { key: 'address', label: 'Address', type: 'text', cols: 6 },
      { key: 'shutoff_type', label: 'Utility Shutoff Type', type: 'select', cols: 6, options: ['Gas', 'Water', 'Electrical', 'HVAC', 'Oxygen Supply', 'N/A'] },
      { key: 'shutoff_location', label: 'Shutoff Location', type: 'text', cols: 6, placeholder: 'e.g., Rear of building, utility closet' },
      { key: 'assembly_point', label: 'Designated Assembly Point', type: 'text', cols: 12, hint: 'Where staff should gather after evacuation' },
      { key: 'notes', label: 'Notes', type: 'textarea', cols: 12 },
    ],
  },
  // ── New Built-in Types (Workplace Safety Program §6, §7, §11) ───
  {
    key: 'hazcom_chemical',
    label: 'HazCom / Chemical Inventory',
    icon: 'mdi-flask',
    color: 'lime-darken-2',
    description: 'Log hazardous chemical inventory, SDS availability, and safe handling per HazCom Program.',
    complianceStandards: ['Cal/OSHA Title 8 §5194', 'GHS / HazCom'],
    fields: [
      { key: 'chemical_name', label: 'Chemical / Product Name', type: 'text', required: true, cols: 6 },
      { key: 'manufacturer', label: 'Manufacturer', type: 'text', cols: 6 },
      { key: 'sds_available', label: 'SDS Available & Accessible?', type: 'boolean', cols: 6 },
      { key: 'properly_labeled', label: 'Container Properly Labeled?', type: 'boolean', cols: 6 },
      { key: 'storage_location', label: 'Storage Location', type: 'text', cols: 6 },
      { key: 'hazard_category', label: 'Hazard Category', type: 'select', cols: 6, options: ['Health Hazard', 'Physical Hazard', 'Environmental Hazard', 'Corrosive', 'Flammable', 'Oxidizer', 'Toxic', 'Irritant'] },
      { key: 'ppe_required', label: 'PPE Required', type: 'multiselect', cols: 6, options: ['Gloves', 'Goggles', 'Mask / Respirator', 'Gown', 'Face Shield', 'Apron', 'None'] },
      { key: 'spill_procedure', label: 'Spill / Exposure Response', type: 'textarea', cols: 12, hint: 'Reference SDS Section 6 for spill guidance' },
      { key: 'notes', label: 'Notes', type: 'textarea', cols: 12 },
    ],
  },
  {
    key: 'ppe_assessment',
    label: 'PPE Assessment / Inspection',
    icon: 'mdi-shield-account',
    color: 'cyan-darken-1',
    description: 'Document PPE hazard assessments, inspections, and deficiency tracking per Cal/OSHA.',
    complianceStandards: ['Cal/OSHA Title 8 §3380-3387', 'OSHA PPE Standard'],
    fields: [
      { key: 'assessment_type', label: 'Assessment Type', type: 'select', required: true, cols: 6, options: ['Hazard Assessment', 'PPE Inspection', 'Stock / Inventory Check', 'Annual Review'] },
      { key: 'area_assessed', label: 'Area / Department', type: 'text', required: true, cols: 6 },
      { key: 'ppe_items_checked', label: 'PPE Items Checked', type: 'multiselect', cols: 12, options: ['Exam Gloves', 'Utility Gloves', 'Masks / Respirators', 'Eye / Face Protection', 'Gowns / Lab Coats', 'Lead Aprons', 'Thyroid Shields', 'Lead Gloves', 'Closed-Toe Shoes', 'Aprons', 'Dosimetry Badges'] },
      { key: 'condition', label: 'Overall Condition', type: 'select', cols: 6, options: ['Good — No Issues', 'Fair — Minor Wear', 'Replace Needed', 'Out of Stock'] },
      { key: 'deficiencies_found', label: 'Deficiencies Found', type: 'textarea', cols: 12 },
      { key: 'corrective_action', label: 'Corrective Action', type: 'textarea', cols: 12 },
      { key: 'notes', label: 'Notes', type: 'textarea', cols: 12 },
    ],
  },
  {
    key: 'employee_acknowledgment',
    label: 'Safety Program Acknowledgment',
    icon: 'mdi-file-sign',
    color: 'green-darken-2',
    description: 'Record employee acknowledgment of receipt and understanding of workplace safety policies.',
    complianceStandards: ['Cal/OSHA Title 8 §3203', 'IIPP Acknowledgment'],
    fields: [
      { key: 'employee_name', label: 'Employee Name', type: 'text', required: true, cols: 6 },
      { key: 'acknowledgment_type', label: 'Acknowledgment Type', type: 'select', required: true, cols: 6, options: ['Initial Hire', 'Annual Review', 'Policy Update', 'Training Completion', 'Return from Leave'] },
      { key: 'sections_reviewed', label: 'Program Sections Reviewed', type: 'multiselect', cols: 12, options: ['IIPP', 'Fire Prevention Plan', 'Emergency Action Plan', 'Hazard Communication (HazCom)', 'PPE Program', 'Radiation Safety', 'Zoonotic Disease Control', 'Sharps Safety', 'Equipment Safety', 'Full Safety Program'] },
      { key: 'acknowledgment_date', label: 'Acknowledgment Date', type: 'date', required: true, cols: 6 },
      { key: 'annual_review_date', label: 'Next Annual Review Date', type: 'date', cols: 6, hint: 'Per policy: annual review required' },
      { key: 'notes', label: 'Notes', type: 'textarea', cols: 12 },
    ],
  },
]

/**
 * Look up a log type config by key.
 */
export function getSafetyLogTypeConfig(key: SafetyLogType): SafetyLogTypeConfig | undefined {
  return SAFETY_LOG_TYPE_CONFIGS.find(c => c.key === key)
}

/**
 * Slug ↔ Key helpers for URL routing.
 * URL: /med-ops/safety/radiation-dosimetry → key: radiation_dosimetry
 */
export function safetySlugToKey(slug: string): SafetyLogType {
  return slug.replace(/-/g, '_') as SafetyLogType
}

export function safetyKeyToSlug(key: SafetyLogType): string {
  return key.replace(/_/g, '-')
}
