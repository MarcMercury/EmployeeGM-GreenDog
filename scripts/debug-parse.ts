import PDFParser from 'pdf2json'
import fs from 'fs'

async function parsePdf(filepath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const pdfParser = new PDFParser()
    pdfParser.on('pdfParser_dataError', (err) => reject(err))
    pdfParser.on('pdfParser_dataReady', (data: any) => {
      let text = ''
      if (data.Pages) {
        for (const page of data.Pages) {
          if (page.Texts) {
            for (const textItem of page.Texts) {
              if (textItem.R) {
                for (const run of textItem.R) {
                  if (run.T) {
                    text += decodeURIComponent(run.T) + ' '
                  }
                }
              }
              text += '\n'
            }
          }
        }
      }
      resolve(text)
    })
    pdfParser.parseBuffer(fs.readFileSync(filepath))
  })
}

const clinicKeywords = [
  'veterinary', 'vet', 'vets', 'animal', 'hospital', 'clinic', 
  'center', 'pet', 'care', 'medical', 'specialty', 'specialists', 'southpaw', 
  'modern', 'vca', 'access', 'affordable', 'angels', 'balboa',
  'beverly', 'calabasas', 'centinela', 'encino', 'emerald', 
  'glendale', 'granada', 'holistika', 'larchmont', 'los altos',
  'los feliz', 'mar vista', 'marina', 'mcgrath', 'metropolitan',
  'mid valley', 'miller', 'mohawk', 'overland', 'pacific', 'palms',
  'palisades', 'park la brea', 'rancho', 'robertson', 'san fernando',
  'santa monica', 'serenity', 'shane', 'sherman oaks', 'sinai',
  'studio city', 'tarzana', 'the pet doctors', 'tlc', 'townsgate',
  'true care', 'truecare', 'valley', 'van nuys', 'village', 
  'warner', 'west la', 'west los angeles', 'westchester', 'winnetka',
  'cahuenga', 'party', 'partyanimals', 'best friends', 'altos'
]

// Words that are clearly NOT part of a clinic name - finalize buffer when we see these
const nonClinicTerms = ['unknown vet', 'green dog']
// Person name patterns - "Last, First" or "Last First Last, First" etc
const personPattern = /^.+,\s+\w+$/  // Anything followed by comma space word
const personStartPattern = /^.+,$/   // Ends with comma (name continues on next line)

const datePattern = /^(\d{2}-\d{2}-\d{4})/
const amountPattern = /^(\d+(?:\.\d{1,2})?)$/

function isClinicPart(line: string): boolean {
  const lower = line.toLowerCase()
  if (datePattern.test(line)) return false
  if (amountPattern.test(line)) return false
  if (/^\d{1,2}:\d{2}(am|pm)?$/i.test(line)) return false
  if (lower === 'unknown' || lower === 'unknown vet') return false
  if (lower.includes('green dog')) return false
  if (/^[A-Za-z]+,\s+[A-Za-z]+$/.test(line)) return false
  if (line.length < 3) return false
  return clinicKeywords.some(kw => lower.includes(kw))
}

async function main() {
  const text = await parsePdf('./public/2023-2024 Ref.pdf')
  const lines = text.split('\n').map(l => l.trim()).filter(l => l)
  
  let inAppointmentRow = false
  let clinicBuffer: string[] = []
  let currentClinic = ''
  let validReferrals = 0
  let clinicTotalsSkipped = 0
  let seenHeader = false // Track when we're past the column headers
  
  // Debug: show lines 700-750
  console.log('Lines 700-750:')
  for (let i = 700; i < 750; i++) {
    console.log(i + ': "' + lines[i] + '"')
  }
  console.log('---')
  
  // Process all lines
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const lineLower = line.toLowerCase()
    
    // Skip until we see the "Amount" column header
    if (lineLower === 'amount' && !seenHeader) {
      seenHeader = true
      continue
    }
    if (!seenHeader) continue
    
    // Skip location headers
    if (lineLower.includes('green dog')) {
      continue
    }
    
    // Detect date = start of appointment row
    if (datePattern.test(line)) {
      inAppointmentRow = true
      clinicBuffer = []
      currentClinic = ''
      continue
    }
    
    // Skip time
    if (/^\d{1,2}:\d{2}(am|pm)?$/i.test(line)) continue
    
    // Skip Unknown (clinic) lines - handle both "Unknown Clinic" as one line 
    // and "Unknown" + "Clinic" split across lines
    if (lineLower === 'unknown' || lineLower === 'unknown clinic') {
      if (inAppointmentRow) {
        // We're in an appointment but "Unknown (Clinic)" appeared - keep looking for actual clinic
        continue
      } else {
        // This is a section header for unknown clinic - skip
        continue
      }
    }
    
    // Skip standalone "Clinic" only when it's part of "Unknown Clinic" split across lines
    if (lineLower === 'clinic') {
      // Look at the PREVIOUS line (skipping any we've already processed)
      // If the previous non-processed line was "Unknown", skip this "Clinic"
      let prevIdx = i - 1
      while (prevIdx >= 0) {
        const prevLine = lines[prevIdx].toLowerCase().trim()
        if (prevLine === 'unknown') {
          // This "Clinic" is part of "Unknown Clinic" - skip it
          continue // Hmm, this continue is for while loop not for loop
        }
        if (prevLine.length > 0 && prevLine !== 'unknown vet' && !prevLine.includes('green dog')) {
          // Found a non-skipped previous line that isn't "Unknown"
          break
        }
        prevIdx--
      }
      // Check if we should skip this "Clinic"
      if (prevIdx >= 0 && lines[prevIdx].toLowerCase().trim() === 'unknown') {
        continue // Skip "Clinic" that follows "Unknown"
      }
    }
    
    // Skip Unknown Vet but stay in appointment row - also finalize clinic buffer
    if (lineLower === 'unknown vet') {
      if (clinicBuffer.length > 0) {
        let finalClinic = clinicBuffer.join(' ').trim()
        // Check for exact duplicate pattern
        const halfLen = clinicBuffer.length / 2
        if (clinicBuffer.length >= 2 && clinicBuffer.length % 2 === 0) {
          const firstHalf = clinicBuffer.slice(0, halfLen).join(' ')
          const secondHalf = clinicBuffer.slice(halfLen).join(' ')
          if (firstHalf === secondHalf) {
            finalClinic = firstHalf
          }
        }
        currentClinic = finalClinic
        clinicBuffer = []
      }
      continue
    }
    
    // Check if line is an amount
    const amountMatch = line.match(amountPattern)
    if (amountMatch) {
      const amount = parseFloat(amountMatch[1])
      
      // Debug around line 1019
      if (i >= 1015 && i <= 1025) {
        console.log('AMT line ' + i + ': $' + amount + ' inAppt=' + inAppointmentRow + ' currentClinic="' + currentClinic + '" buffer=' + JSON.stringify(clinicBuffer))
      }
      
      if (!inAppointmentRow) {
        clinicTotalsSkipped++
        // Also reset clinic buffer since we finished a clinic section
        clinicBuffer = []
        currentClinic = ''
      } else if (currentClinic) {
        validReferrals++
        // Debug all counts
        if (i >= 750) {
          console.log('>>> COUNTING line ' + i + ': $' + amount + ' clinic=' + currentClinic)
        }
        if (validReferrals <= 50) {
          console.log('COUNT line ' + i + ': $' + amount + ' clinic=' + currentClinic)
        }
        // Reset after counting - each appointment ends with its amount
        inAppointmentRow = false
        clinicBuffer = []
        currentClinic = ''
      } else {
        console.log('MISS line ' + i + ': $' + amount + ' (no currentClinic, buffer=' + JSON.stringify(clinicBuffer) + ')')
      }
      continue
    }
    
    // Build clinic name from parts
    // Debug line 1014-1019
    if (i >= 1010 && i <= 1020) {
      console.log('LINE ' + i + ': "' + line + '" inAppt=' + inAppointmentRow + ' isClinicPart=' + isClinicPart(line))
    }
    
    if (inAppointmentRow && isClinicPart(line)) {
      // Debug line 1011-1015
      if (i >= 1008 && i <= 1020) {
        console.log('CLINIC PART line ' + i + ': "' + line + '" buffer=' + JSON.stringify(clinicBuffer))
      }
      // Avoid duplicates - don't add if it's the same as the last buffer entry
      if (clinicBuffer.length === 0 || clinicBuffer[clinicBuffer.length - 1] !== line) {
        clinicBuffer.push(line)
      }
    } else if (inAppointmentRow && !isClinicPart(line)) {
      // Non-clinic line in appointment row - check if it's a definite break point
      const isDefiniteBreak = nonClinicTerms.some(t => lineLower.includes(t)) || 
                              personPattern.test(line) ||
                              personStartPattern.test(line)
      
      // Debug line 1014
      if (i >= 1014 && i <= 1016) {
        console.log('NON-CLINIC line ' + i + ': "' + line + '" isBreak=' + isDefiniteBreak + ' personPattern=' + personPattern.test(line) + ' buffer=' + JSON.stringify(clinicBuffer))
      }
      
      if (isDefiniteBreak && clinicBuffer.length > 0) {
        // Finalize buffer on definite break
        let finalClinic = clinicBuffer.join(' ').trim()
        // Check for exact duplicate pattern (e.g., "A B A B" -> "A B")
        const halfLen = clinicBuffer.length / 2
        if (clinicBuffer.length >= 2 && clinicBuffer.length % 2 === 0) {
          const firstHalf = clinicBuffer.slice(0, halfLen).join(' ')
          const secondHalf = clinicBuffer.slice(halfLen).join(' ')
          if (firstHalf === secondHalf) {
            finalClinic = firstHalf
          }
        }
        // Debug line 1014
        if (i === 1014) {
          console.log('FINALIZE at line ' + i + ': finalClinic="' + finalClinic + '"')
        }
        currentClinic = finalClinic
        clinicBuffer = []
      } else if (!isDefiniteBreak && line.length <= 20) {
        // Short connecting words like "of the", "and", etc. - add to buffer
        clinicBuffer.push(line)
      }
    }
  }
  
  console.log('')
  console.log('Summary: validReferrals=' + validReferrals + ', clinicTotalsSkipped=' + clinicTotalsSkipped)
}

main().catch(console.error)
