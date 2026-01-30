/**
 * Parse Contacts from Notes Script
 * 
 * Extracts contact names from the notes field (specifically [Primary DVMs] section)
 * and creates individual contact records in partner_contacts table.
 * 
 * Usage: npx tsx scripts/parse-contacts-from-notes.ts [--dry-run]
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

const DRY_RUN = process.argv.includes('--dry-run')

interface ParsedContact {
  name: string
  title: string | null
  is_primary: boolean
}

/**
 * Parse contact names from notes field
 * Looks for [Primary DVMs]: section and extracts individual names
 */
function parseContactsFromNotes(notes: string): ParsedContact[] {
  const contacts: ParsedContact[] = []
  
  if (!notes) return contacts
  
  // Pattern 1: [Primary DVMs]: followed by comma-separated list of Dr. names
  const dvmMatch = notes.match(/\[Primary DVMs?\]:\s*([^\[]+)/i)
  if (dvmMatch) {
    const dvmList = dvmMatch[1]
    // Split by comma and clean up each name
    const names = dvmList.split(/,\s*/).map(name => name.trim()).filter(name => name.length > 0)
    
    for (const name of names) {
      // Clean up the name - remove newlines, extra spaces
      let cleanName = name.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim()
      
      // Skip if too short or just punctuation
      if (cleanName.length < 3) continue
      
      // Check if this entry contains multiple names separated by / or "and"
      // e.g., "Dr. Heidi Hillary and Dr Lee (relief)" or "Dr. Vanessa Vandersande / Dr. Nicole Watts"
      const multiNamePatterns = [
        /\s*\/\s*/,  // Split by /
        /\s+and\s+/i,  // Split by "and"
        /\s*&\s*/,  // Split by &
      ]
      
      let subNames = [cleanName]
      for (const pattern of multiNamePatterns) {
        if (pattern.test(cleanName)) {
          subNames = cleanName.split(pattern).map(n => n.trim()).filter(n => n.length > 2)
          break
        }
      }
      
      for (let subName of subNames) {
        // Further clean each sub-name
        // Remove parenthetical notes like "(relief)" or "(Chief of Staff)"
        subName = subName.replace(/\s*\([^)]+\)\s*/g, ' ').trim()
        
        // Determine if it's a doctor (has Dr. prefix)
        const isDoctor = /^(dr\.?|sr\.?)\s+/i.test(subName)
        
        // Normalize Dr. prefix
        subName = subName
          .replace(/^dr\.\s*/i, 'Dr. ')
          .replace(/^sr\.\s*/i, 'Dr. ') // Typo in data, Sr. should be Dr.
        
        // Skip duplicates, invalid entries, and notes
        if (subName.length < 3) continue
        if (subName.startsWith('*')) continue // Skip notes like "*See Serenity VET"
        if (/^(See |N\/A|None|Unknown)/i.test(subName)) continue
        
        if (!contacts.some(c => c.name.toLowerCase() === subName.toLowerCase())) {
          contacts.push({
            name: subName,
            title: isDoctor ? 'DVM' : null,
            is_primary: false
          })
        }
      }
    }
    
    // Mark first contact as primary if we have any
    if (contacts.length > 0) {
      contacts[0].is_primary = true
    }
  }
  
  return contacts
}

async function main() {
  console.log('='.repeat(60))
  console.log('Parse Contacts from Notes Script')
  console.log(DRY_RUN ? '(DRY RUN - no changes will be made)' : '(LIVE RUN)')
  console.log('='.repeat(60))
  
  // Fetch all partners with notes
  const { data: partners, error: fetchError } = await supabase
    .from('referral_partners')
    .select('id, name, notes')
    .not('notes', 'is', null)
    .order('name')
  
  if (fetchError) {
    console.error('Error fetching partners:', fetchError)
    process.exit(1)
  }
  
  console.log(`Found ${partners.length} partners with notes`)
  
  // Fetch existing contacts to avoid duplicates
  const { data: existingContacts, error: contactsError } = await supabase
    .from('partner_contacts')
    .select('partner_id, name')
  
  if (contactsError) {
    console.error('Error fetching existing contacts:', contactsError)
    process.exit(1)
  }
  
  // Build a set of existing contacts for quick lookup
  const existingContactSet = new Set(
    existingContacts.map(c => `${c.partner_id}:${c.name.toLowerCase()}`)
  )
  
  console.log(`Found ${existingContacts.length} existing contacts`)
  
  let totalParsed = 0
  let totalInserted = 0
  let totalSkipped = 0
  const results: { partner: string; contacts: string[]; skipped: string[] }[] = []
  
  for (const partner of partners) {
    const parsedContacts = parseContactsFromNotes(partner.notes)
    
    if (parsedContacts.length === 0) continue
    
    totalParsed += parsedContacts.length
    
    const toInsert: typeof parsedContacts = []
    const skippedContacts: string[] = []
    
    for (const contact of parsedContacts) {
      const key = `${partner.id}:${contact.name.toLowerCase()}`
      if (existingContactSet.has(key)) {
        skippedContacts.push(contact.name)
        totalSkipped++
      } else {
        toInsert.push(contact)
      }
    }
    
    if (toInsert.length > 0) {
      results.push({
        partner: partner.name,
        contacts: toInsert.map(c => c.name),
        skipped: skippedContacts
      })
      
      if (!DRY_RUN) {
        const insertData = toInsert.map(c => ({
          partner_id: partner.id,
          name: c.name,
          title: c.title,
          is_primary: c.is_primary
        }))
        
        const { error: insertError } = await supabase
          .from('partner_contacts')
          .insert(insertData)
        
        if (insertError) {
          console.error(`Error inserting contacts for ${partner.name}:`, insertError.message)
        } else {
          totalInserted += toInsert.length
        }
      } else {
        totalInserted += toInsert.length
      }
    }
  }
  
  // Print results
  console.log('\n' + '='.repeat(60))
  console.log('Results:')
  console.log('='.repeat(60))
  
  for (const result of results.slice(0, 20)) {
    console.log(`\n${result.partner}:`)
    console.log(`  New contacts (${result.contacts.length}): ${result.contacts.slice(0, 5).join(', ')}${result.contacts.length > 5 ? '...' : ''}`)
    if (result.skipped.length > 0) {
      console.log(`  Skipped (${result.skipped.length}): ${result.skipped.join(', ')}`)
    }
  }
  
  if (results.length > 20) {
    console.log(`\n... and ${results.length - 20} more partners`)
  }
  
  console.log('\n' + '='.repeat(60))
  console.log('Summary:')
  console.log('='.repeat(60))
  console.log(`Partners processed: ${partners.length}`)
  console.log(`Contacts parsed from notes: ${totalParsed}`)
  console.log(`New contacts ${DRY_RUN ? 'to insert' : 'inserted'}: ${totalInserted}`)
  console.log(`Skipped (already exist): ${totalSkipped}`)
  
  if (DRY_RUN) {
    console.log('\n⚠️  DRY RUN - No changes were made. Run without --dry-run to insert contacts.')
  }
}

main().catch(console.error)
