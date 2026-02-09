/**
 * POST /api/intake/promote
 * 
 * Promotes a person to the next lifecycle stage.
 * Admin only endpoint.
 * 
 * Body: {
 *   personId: string (unified_persons.id)
 *   targetStage: 'applicant' | 'student' | 'hired' | 'employee'
 *   options: object (stage-specific options)
 * }
 * 
 * Options by target stage:
 * 
 * applicant:
 *   - targetPositionId?: string
 *   - targetDepartmentId?: string
 *   - targetLocationId?: string
 *   - resumeUrl?: string
 *   - notes?: string
 * 
 * student:
 *   - programName: string
 *   - schoolOfOrigin?: string
 *   - visitStartDate?: string (ISO date)
 *   - visitEndDate?: string (ISO date)
 *   - externshipGoals?: object
 * 
 * hired:
 *   - targetStartDate?: string (ISO date)
 * 
 * employee:
 *   - employmentType: string ('full_time', 'part_time', 'contract')
 *   - jobTitleId: string
 *   - startDate: string (ISO date)
 *   - startingWage: number
 *   - payType?: string ('hourly', 'salary')
 *   - departmentId?: string
 *   - locationId?: string
 */

import { createAdminClient, verifyAdminAccess } from '../../utils/intake'

interface PromoteBody {
  personId: string
  targetStage: 'applicant' | 'student' | 'hired' | 'employee'
  options: Record<string, unknown>
}

export default defineEventHandler(async (event) => {
  // Verify admin access
  const { profileId } = await verifyAdminAccess(event)

  // Get request body
  const body = await readBody<PromoteBody>(event)

  // Validate required fields
  if (!body.personId) {
    throw createError({
      statusCode: 400,
      message: 'personId is required'
    })
  }

  const validStages = ['applicant', 'student', 'hired', 'employee']
  if (!body.targetStage || !validStages.includes(body.targetStage)) {
    throw createError({
      statusCode: 400,
      message: `Invalid targetStage. Must be one of: ${validStages.join(', ')}`
    })
  }

  const adminClient = createAdminClient()

  // Verify person exists
  const { data: person, error: personError } = await adminClient
    .from('unified_persons')
    .select('*')
    .eq('id', body.personId)
    .single()

  if (personError || !person) {
    throw createError({
      statusCode: 404,
      message: 'Person not found'
    })
  }

  let result: { success: boolean; data: unknown; message: string }

  try {
    switch (body.targetStage) {
      case 'applicant': {
        const { data, error } = await adminClient.rpc('promote_to_applicant', {
          p_person_id: body.personId,
          p_target_position_id: body.options.targetPositionId || null,
          p_target_department_id: body.options.targetDepartmentId || null,
          p_target_location_id: body.options.targetLocationId || null,
          p_resume_url: body.options.resumeUrl || null,
          p_notes: body.options.notes || null
        })

        if (error) throw error

        result = {
          success: true,
          data: { candidateId: data },
          message: `${person.first_name} ${person.last_name} has been promoted to Applicant`
        }
        break
      }

      case 'student': {
        if (!body.options.programName) {
          throw createError({
            statusCode: 400,
            message: 'programName is required for student promotion'
          })
        }

        const { data, error } = await adminClient.rpc('promote_to_student', {
          p_person_id: body.personId,
          p_program_name: body.options.programName,
          p_school_of_origin: body.options.schoolOfOrigin || null,
          p_visit_start_date: body.options.visitStartDate || null,
          p_visit_end_date: body.options.visitEndDate || null,
          p_externship_goals: body.options.externshipGoals || null
        })

        if (error) throw error

        result = {
          success: true,
          data: { educationVisitorId: data },
          message: `${person.first_name} ${person.last_name} has been enrolled as a Student`
        }
        break
      }

      case 'hired': {
        const { data, error } = await adminClient.rpc('promote_to_hired', {
          p_person_id: body.personId,
          p_target_start_date: body.options.targetStartDate || null
        })

        if (error) throw error

        result = {
          success: true,
          data: { candidateId: data },
          message: `${person.first_name} ${person.last_name} has been marked as Hired!`
        }
        break
      }

      case 'employee': {
        // Validate required fields for employee promotion
        const requiredFields = ['employmentType', 'jobTitleId', 'startDate', 'startingWage']
        for (const field of requiredFields) {
          if (!body.options[field]) {
            throw createError({
              statusCode: 400,
              message: `${field} is required for employee promotion`
            })
          }
        }

        const { data, error } = await adminClient.rpc('complete_hire_to_employee', {
          p_person_id: body.personId,
          p_employment_type: body.options.employmentType,
          p_job_title_id: body.options.jobTitleId,
          p_start_date: body.options.startDate,
          p_starting_wage: body.options.startingWage,
          p_pay_type: body.options.payType || 'hourly',
          p_department_id: body.options.departmentId || null,
          p_location_id: body.options.locationId || null
        })

        if (error) throw error

        result = {
          success: true,
          data: { employeeId: data },
          message: `${person.first_name} ${person.last_name} is now an Employee! 🎉`
        }
        break
      }

      default:
        throw createError({
          statusCode: 400,
          message: 'Invalid target stage'
        })
    }
  } catch (err) {
    logger.error('Promotion error', err instanceof Error ? err : null, 'intake/promote')
    
    const errorMessage = err instanceof Error ? err.message : 'Promotion failed'
    
    throw createError({
      statusCode: 500,
      message: errorMessage
    })
  }

  // Get updated person data
  const { data: updatedPerson } = await adminClient
    .from('unified_persons_view')
    .select('*')
    .eq('id', body.personId)
    .single()

  return {
    ...result,
    data: {
      ...result.data,
      person: updatedPerson
    }
  }
})
