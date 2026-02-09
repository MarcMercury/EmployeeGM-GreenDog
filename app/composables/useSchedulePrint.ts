import { format, addDays } from 'date-fns'
import type { ScheduleShift, ScheduleEmployee } from '~/types/schedule.types'

export function useSchedulePrint() {
  const printSchedule = (params: {
    currentWeekStart: Date
    shifts: ScheduleShift[]
    employees: ScheduleEmployee[]
    weekStatusLabel: string
    draftShiftCount: number
    publishedShiftCount: number
  }) => {
    const { currentWeekStart, shifts, employees, weekStatusLabel, draftShiftCount, publishedShiftCount } = params

    // Create a printable version of the schedule
    const printWindow = window.open('', '_blank', 'width=1200,height=800')
    if (!printWindow) {
      alert('Please allow popups to print the schedule')
      return
    }

    // Build schedule HTML
    const weekStartFormatted = format(currentWeekStart, 'MMM d, yyyy')
    const weekEndFormatted = format(addDays(currentWeekStart, 6), 'MMM d, yyyy')

    // Build shift rows by employee
    const employeeShifts = new Map<string, { name: string; shifts: ScheduleShift[] }>()

    // Initialize with all employees
    employees.forEach(emp => {
      employeeShifts.set(emp.id, {
        name: `${emp.first_name} ${emp.last_name}`,
        shifts: []
      })
    })

    // Group shifts by employee
    shifts.forEach(shift => {
      if (shift.employee_id) {
        const empData = employeeShifts.get(shift.employee_id)
        if (empData) {
          empData.shifts.push(shift)
        }
      }
    })

    // Generate day headers
    const dayHeaders = Array.from({ length: 7 }, (_, i) => {
      const date = addDays(currentWeekStart, i)
      return format(date, 'EEE M/d')
    })

    // Generate rows
    let rows = ''
    employeeShifts.forEach((empData, empId) => {
      const cells = dayHeaders.map((_, dayIndex) => {
        const dayDate = addDays(currentWeekStart, dayIndex)
        const dayStart = dayDate.getTime()
        const dayEnd = addDays(dayDate, 1).getTime()

        const dayShifts = empData.shifts.filter(s => {
          const shiftStart = new Date(s.start_at).getTime()
          return shiftStart >= dayStart && shiftStart < dayEnd
        })

        if (dayShifts.length === 0) return '<td class="cell">-</td>'

        const shiftTexts = dayShifts.map(s => {
          const start = format(new Date(s.start_at), 'h:mma')
          const end = format(new Date(s.end_at), 'h:mma')
          return `${start}-${end}`
        }).join('<br>')

        return `<td class="cell">${shiftTexts}</td>`
      }).join('')

      // Calculate total hours for this employee
      const totalHours = empData.shifts.reduce((sum, s) => {
        const start = new Date(s.start_at).getTime()
        const end = new Date(s.end_at).getTime()
        return sum + (end - start) / (1000 * 60 * 60)
      }, 0)

      rows += `<tr>
      <td class="name-cell">${empData.name}</td>
      ${cells}
      <td class="cell total">${totalHours.toFixed(1)}h</td>
    </tr>`
    })

    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Schedule: ${weekStartFormatted} - ${weekEndFormatted}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 20px; }
    h1 { font-size: 18px; margin-bottom: 5px; }
    .subtitle { color: #666; margin-bottom: 20px; }
    table { border-collapse: collapse; width: 100%; font-size: 11px; }
    th, td { border: 1px solid #ddd; padding: 6px; text-align: center; }
    th { background: #f5f5f5; font-weight: bold; }
    .name-cell { text-align: left; font-weight: 500; white-space: nowrap; }
    .cell { min-width: 80px; }
    .total { background: #f0f0f0; font-weight: bold; }
    .status { margin-top: 10px; font-size: 12px; color: #666; }
    @media print {
      body { padding: 0; }
      button { display: none; }
    }
  </style>
</head>
<body>
  <h1>Weekly Schedule</h1>
  <div class="subtitle">${weekStartFormatted} - ${weekEndFormatted} | Status: ${weekStatusLabel}</div>
  <table>
    <thead>
      <tr>
        <th class="name-cell">Employee</th>
        ${dayHeaders.map(d => `<th>${d}</th>`).join('')}
        <th>Total</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>
  <div class="status">
    <strong>Draft shifts:</strong> ${draftShiftCount} | 
    <strong>Published shifts:</strong> ${publishedShiftCount} |
    <strong>Total employees:</strong> ${employees.length}
  </div>
  <br>
  <button onclick="window.print()">Print</button>
  <button onclick="window.close()">Close</button>
</body>
</html>`

    printWindow.document.write(html)
    printWindow.document.close()
  }

  return { printSchedule }
}
