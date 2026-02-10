/**
 * Appointment Types Reference API
 * 
 * GET /api/appointments/types
 * 
 * Returns the complete catalog of known GreenDog appointment types
 * with their service category mappings, departments, and attributes.
 * Used by the frontend for display and by AI for context.
 */

import {
  GDD_APPOINTMENT_TYPE_MAP,
  getServiceDepartmentSummary,
} from '~/server/utils/appointments/clinic-report-parser'

export default defineEventHandler(async () => {
  // Convert the type map to a sorted array
  const types = Object.entries(GDD_APPOINTMENT_TYPE_MAP)
    .filter(([_, info]) => info.serviceCode !== 'OTHER')
    .map(([name, info]) => ({
      name,
      serviceCode: info.serviceCode,
      department: info.department,
      requiresDVM: info.requiresDVM,
      defaultDuration: info.defaultDuration,
      isAvailability: name.toLowerCase().includes('avail'),
    }))
    .sort((a, b) => a.department.localeCompare(b.department) || a.name.localeCompare(b.name))

  const departments = getServiceDepartmentSummary()

  // Build service code legend
  const serviceCodes: Record<string, string> = {
    DENTAL: 'Dentistry (NAD, NEAT, Oral Exams, GDD)',
    AP: 'Advanced Procedures (under anesthesia)',
    WELLNESS: 'Wellness / Veterinary Exams / Urgent Care',
    ADDON: 'Add-on Services (Tech Services, Bloodwork)',
    IMAGING: 'Imaging (X-ray, Radiographs)',
    SURG: 'Surgery',
    EXOTIC: 'Exotics (Avian, Reptile, Small Mammals)',
    IM: 'Internal Medicine',
    CARDIO: 'Cardiology',
    MPMV: 'Mobile Pet Medicine / MPMV',
  }

  return {
    types,
    departments,
    serviceCodes,
    totalTypes: types.length,
    totalDepartments: departments.length,
  }
})
