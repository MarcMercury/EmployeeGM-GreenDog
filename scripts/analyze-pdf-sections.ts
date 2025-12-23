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
  'cahuenga', 'party', 'partyanimals', 'altos'
]

function isValidClinic(combined: string): boolean {
  const lower = combined.toLowerCase()
  return (
    lower.includes('veterinary') ||
    lower.includes(' vet ') ||
    lower.includes(' vets') ||
    lower.includes('animal hospital') ||
    lower.includes('animal clinic') ||
    lower.includes('pet hospital') ||
    lower.includes('pet clinic') ||
    lower.includes('pet medical') ||
    lower.includes('pet care') ||
    lower.includes('pet doctors') ||
    /\bvca\b/.test(lower) ||
    lower.includes('southpaw') ||
    lower.includes('modern animal') ||
    lower.includes('partyanimals') ||
    (lower.includes('hospital') && lower.includes('animal')) ||
    (lower.includes('clinic') && (lower.includes('animal') || lower.includes('pet'))) ||
    (lower.includes('center') && (lower.includes('animal') || lower.includes('medical') || lower.includes('veterinary')))
  )
}

async function main() {
  const text = await parsePdf('./public/2023-2024 Ref.pdf')
  const lines = text.split('\n').map(l => l.trim()).filter(l => l)
  
  const datePattern = /^\d{2}-\d{2}-\d{4}$/
  const amountPattern = /^\d+(?:\.\d{1,2})?$/
  const timePattern = /^\d{1,2}:\d{2}(am|pm)?$/i
  
  // Find section headers: [text] [amount] [date]
  const sections: Array<{clinicName: string, amount: number, line: number}> = []
  
  for (let i = 0; i < lines.length - 2; i++) {
    // Look for amount followed by date
    if (amountPattern.test(lines[i]) && datePattern.test(lines[i + 1])) {
      // Look back for clinic name
      const clinicLines: string[] = []
      let j = i - 1
      while (j >= 0 && j >= i - 5) {
        const testLine = lines[j]
        const testLower = testLine.toLowerCase()
        
        if (datePattern.test(testLine) || amountPattern.test(testLine) || 
            timePattern.test(testLine) || testLower.includes('green dog') ||
            testLower === 'unknown vet' || /^[A-Za-z]+,/.test(testLine)) {
          break
        }
        
        clinicLines.unshift(testLine)
        j--
      }
      
      if (clinicLines.length > 0) {
        const clinicName = clinicLines.join(' ')
        const amount = parseFloat(lines[i])
        const lowerClinic = clinicName.toLowerCase()
        
        if (!lowerClinic.includes('unknown') && isValidClinic(clinicName)) {
          sections.push({
            clinicName: clinicName,
            amount: amount,
            line: i
          })
          
          if (sections.length <= 20) {
            console.log('Section at line ' + i + ': ' + clinicName + ' = $' + amount)
          }
        }
      }
    }
  }
  
  console.log('')
  console.log('Total sections found: ' + sections.length)
  
  // Group by clinic name and show totals
  const clinicTotals = new Map<string, number>()
  for (const s of sections) {
    const existing = clinicTotals.get(s.clinicName) || 0
    clinicTotals.set(s.clinicName, existing + s.amount)
  }
  
  console.log('\nClinic totals:')
  const sorted = Array.from(clinicTotals.entries()).sort((a, b) => b[1] - a[1])
  for (const [clinic, total] of sorted.slice(0, 30)) {
    console.log(`  $${total.toFixed(2)} - ${clinic}`)
  }
}

main().catch(console.error)
