/**
 * CE Tracker PDF Parser & Migration Script
 * 
 * Parses the CE Tracker - Registration Responses PDF and migrates
 * all entries to the education_visitors table in Supabase
 * 
 * Run with: node scripts/parse-ce-tracker.cjs
 */

const fs = require('fs');
const path = require('path');
const { PDFParse } = require('pdf-parse');

// Path to the PDF
const PDF_PATH = path.join(__dirname, '../public/CE Tracker - Registration Responses.pdf');

// Normalized data structure for merging
const normalizedRecords = new Map(); // Key: normalized identifier -> merged record

// Email regex
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const PHONE_REGEX = /(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}/g;
const LICENSE_REGEX = /(?:DVM|RVT|CVT|LVT)?\s*#?\s*\d{4,10}/gi;

// Common role keywords
const ROLE_KEYWORDS = {
  DVM: ['dvm', 'veterinarian', 'doctor', 'dr.', 'dr ', 'vet '],
  RVT: ['rvt', 'cvt', 'lvt', 'technician', 'tech'],
  Student: ['student', 'vet student', 'extern', 'intern'],
  Admin: ['manager', 'admin', 'office', 'receptionist', 'client service'],
  Unknown: []
};

// States abbreviations for license detection
const STATES = ['AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC'];

// Event name patterns
const EVENT_PATTERNS = [
  /(?:dentistry|dental)/i,
  /(?:anesthesia)/i,
  /(?:radiology|x-ray)/i,
  /(?:surgery|surgical)/i,
  /(?:nutrition)/i,
  /(?:behavior)/i,
  /(?:oncology)/i,
  /(?:dermatology)/i,
  /(?:cardiology)/i,
  /(?:internal medicine)/i,
  /(?:emergency|critical care)/i,
  /(?:ophthalmology)/i,
  /(?:orthopedics)/i,
  /(?:exotic|exotics)/i,
];

/**
 * Normalize a name for matching purposes
 */
function normalizeName(name) {
  if (!name) return '';
  return name.toLowerCase()
    .replace(/[^a-z\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Generate a matching key for deduplication
 */
function generateMatchKey(record) {
  // Priority 1: Email
  if (record.email) {
    return `email:${record.email.toLowerCase().trim()}`;
  }
  
  // Priority 2: Full name + phone
  if (record.firstName && record.lastName && record.phone) {
    return `namephn:${normalizeName(record.firstName + ' ' + record.lastName)}:${record.phone.replace(/\D/g, '')}`;
  }
  
  // Priority 3: Full name + clinic
  if (record.firstName && record.lastName && record.clinic) {
    return `nameclin:${normalizeName(record.firstName + ' ' + record.lastName)}:${normalizeName(record.clinic)}`;
  }
  
  // Priority 4: License number
  if (record.licenseNumber) {
    return `license:${record.licenseNumber.replace(/\D/g, '')}`;
  }
  
  // Priority 5: Just full name (weakest match)
  if (record.firstName && record.lastName) {
    return `name:${normalizeName(record.firstName + ' ' + record.lastName)}`;
  }
  
  return null; // No identifying information
}

/**
 * Extract role from text
 */
function detectRole(text) {
  if (!text) return 'Unknown';
  const lower = text.toLowerCase();
  
  for (const [role, keywords] of Object.entries(ROLE_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lower.includes(keyword)) {
        return role;
      }
    }
  }
  return 'Unknown';
}

/**
 * Extract states from text
 */
function extractStates(text) {
  if (!text) return [];
  const found = [];
  for (const state of STATES) {
    const regex = new RegExp(`\\b${state}\\b`, 'g');
    if (regex.test(text)) {
      found.push(state);
    }
  }
  return [...new Set(found)];
}

/**
 * Parse name into first/last
 */
function parseName(fullName) {
  if (!fullName) return { firstName: '', lastName: '' };
  
  const cleaned = fullName.replace(/\s+/g, ' ').trim();
  const parts = cleaned.split(' ');
  
  if (parts.length === 0) return { firstName: '', lastName: '' };
  if (parts.length === 1) return { firstName: parts[0], lastName: '' };
  
  // Handle prefixes like Dr., DVM, etc.
  let startIdx = 0;
  if (['dr', 'dr.', 'dvm', 'ms', 'ms.', 'mr', 'mr.', 'mrs', 'mrs.'].includes(parts[0].toLowerCase())) {
    startIdx = 1;
  }
  
  const firstName = parts[startIdx] || '';
  const lastName = parts.slice(startIdx + 1).join(' ');
  
  return { firstName, lastName };
}

/**
 * Extract a single record from a text block
 */
function extractRecordFromBlock(block, pageContext) {
  const record = {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    clinic: '',
    states: [],
    licenseNumber: '',
    role: 'Unknown',
    source: 'CE Tracker PDF Import',
    howHeard: '',
    events: [],
    attendanceStatus: 'registered',
    dietary: '',
    allergies: '',
    comments: '',
    notes: '',
    isPaid: null,
    paymentRef: '',
    ticketCount: null,
    rawText: block
  };
  
  // Try to parse tab-separated format: Timestamp \t Name \t Phone \t Email \t ...
  const tabs = block.split('\t').map(s => s.trim());
  
  // The PDF format is typically: Timestamp | Name | Phone | Email | License | State | Clinic | ...
  // Try to extract name from second column if it looks like a name
  if (tabs.length >= 2) {
    // First column is usually timestamp (date format)
    const potentialName = tabs[1];
    if (potentialName && /^[A-Z][a-z]+\s+[A-Z]?[a-z]*/.test(potentialName) && !EMAIL_REGEX.test(potentialName)) {
      const { firstName, lastName } = parseName(potentialName);
      record.firstName = firstName;
      record.lastName = lastName;
    }
    
    // Look for clinic name in later columns
    for (let i = 5; i < Math.min(tabs.length, 10); i++) {
      const col = tabs[i];
      if (col && col.length > 3 && !/^\d+$/.test(col) && !EMAIL_REGEX.test(col) && !PHONE_REGEX.test(col)) {
        // Check if it looks like a clinic/organization name
        if (/(?:animal|vet|clinic|hospital|pet|green dog|dental)/i.test(col)) {
          record.clinic = col;
          break;
        }
      }
    }
  }
  
  // Fallback: Try to find name pattern in raw text before email
  if (!record.firstName && !record.lastName) {
    const emails = block.match(EMAIL_REGEX);
    if (emails) {
      const beforeEmail = block.split(emails[0])[0];
      // Look for name pattern: First Last (2+ words with capital letters)
      const nameMatch = beforeEmail.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/);
      if (nameMatch) {
        const { firstName, lastName } = parseName(nameMatch[1]);
        record.firstName = firstName;
        record.lastName = lastName;
      }
    }
  }
  
  // Extract emails
  const emails = block.match(EMAIL_REGEX);
  if (emails && emails.length > 0) {
    record.email = emails[0].toLowerCase().trim();
  }
  
  // Extract phones
  const phones = block.match(PHONE_REGEX);
  if (phones && phones.length > 0) {
    record.phone = phones[0].replace(/\D/g, '');
    if (record.phone.length === 10) {
      record.phone = `(${record.phone.slice(0, 3)}) ${record.phone.slice(3, 6)}-${record.phone.slice(6)}`;
    }
  }
  
  // Extract license numbers - be more specific to avoid matching years
  const licenseMatches = block.match(/(?:RVT|CVT|LVT|DVM)[\s#-]*(\d{3,6})/gi);
  if (licenseMatches && licenseMatches.length > 0) {
    record.licenseNumber = licenseMatches[0].replace(/\s+/g, '');
  }
  
  // Extract states
  record.states = extractStates(block);
  
  // Detect role
  record.role = detectRole(block);
  
  // Check payment status
  if (/paid|payment received|confirmed/i.test(block)) {
    record.isPaid = true;
  } else if (/refund|cancelled|cancel/i.test(block)) {
    record.isPaid = false;
    record.attendanceStatus = 'cancelled';
  } else if (/gifted|comp|complimentary/i.test(block)) {
    record.isPaid = false;
    record.notes += ' Gifted ticket.';
  }
  
  // Check attendance
  if (/attended|present|checked.?in/i.test(block)) {
    record.attendanceStatus = 'attended';
  } else if (/no.?show|absent|did not attend/i.test(block)) {
    record.attendanceStatus = 'no_show';
  }
  
  // Extract dietary/allergies
  const dietaryMatch = block.match(/(?:dietary|diet|food)[:\s]*([^\n.]+)/i);
  if (dietaryMatch) {
    record.dietary = dietaryMatch[1].trim();
  }
  
  const allergyMatch = block.match(/(?:allerg(?:y|ies)|allergic)[:\s]*([^\n.]+)/i);
  if (allergyMatch) {
    record.allergies = allergyMatch[1].trim();
  }
  
  // Extract "how heard"
  const heardMatch = block.match(/(?:how did you hear|heard about|referred by|referral)[:\s]*([^\n]+)/i);
  if (heardMatch) {
    record.howHeard = heardMatch[1].trim();
  }
  
  // Extract comments/questions
  const commentMatch = block.match(/(?:comment|question|note)[s]?[:\s]*([^\n]+)/i);
  if (commentMatch) {
    record.comments = commentMatch[1].trim();
  }
  
  // Add page context as event if available
  if (pageContext.eventName) {
    record.events.push(pageContext.eventName);
  }
  
  return record;
}

/**
 * Parse a registration form page
 */
function parseRegistrationPage(text, pageNum) {
  const records = [];
  const pageContext = { eventName: '', pageType: 'registration' };
  
  // Try to detect event name from page header
  for (const pattern of EVENT_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      pageContext.eventName = `Green Dog CE - ${match[0]}`;
      break;
    }
  }
  
  // Look for CE or event mentions
  const ceMatch = text.match(/(?:CE|continuing education|seminar|workshop|course)[:\s]*([^\n]+)/i);
  if (ceMatch && !pageContext.eventName) {
    pageContext.eventName = ceMatch[1].trim().slice(0, 100);
  }
  
  // Split by common delimiters
  // Try to find record boundaries - look for patterns that indicate new entries
  const lines = text.split('\n').filter(l => l.trim());
  
  let currentBlock = '';
  
  for (const line of lines) {
    // Check if this line starts a new record (has email or looks like a name)
    const hasEmail = EMAIL_REGEX.test(line);
    const looksLikeName = /^[A-Z][a-z]+\s+[A-Z][a-z]+/.test(line.trim());
    const isNewEntry = line.includes('Timestamp') || line.includes('Entry') || /^\d{1,2}\/\d{1,2}\/\d{2,4}/.test(line.trim());
    
    if ((hasEmail || looksLikeName || isNewEntry) && currentBlock.length > 50) {
      // Process previous block
      const record = extractRecordFromBlock(currentBlock, pageContext);
      if (record.email || (record.firstName && record.phone)) {
        records.push(record);
      }
      currentBlock = line;
    } else {
      currentBlock += '\n' + line;
    }
  }
  
  // Process last block
  if (currentBlock.length > 20) {
    const record = extractRecordFromBlock(currentBlock, pageContext);
    if (record.email || record.firstName) {
      records.push(record);
    }
  }
  
  return records;
}

/**
 * Parse a page with structured table-like data
 */
function parseTablePage(text, pageNum) {
  const records = [];
  const lines = text.split('\n').filter(l => l.trim());
  const pageContext = { eventName: 'Green Dog CE Event', pageType: 'table' };
  
  // Detect if this is an attendance or registration sheet
  if (/attendance|check.?in|present/i.test(text.slice(0, 200))) {
    pageContext.pageType = 'attendance';
  }
  
  // Look for patterns that indicate structured data
  for (const line of lines) {
    // Skip header-like lines
    if (/^(name|email|phone|date|time|#|no\.|number)/i.test(line.trim())) {
      continue;
    }
    
    // Check if line has an email - strong indicator of a record
    const emails = line.match(EMAIL_REGEX);
    if (emails) {
      const record = extractRecordFromBlock(line, pageContext);
      
      // Try to extract name from the portion before email
      const beforeEmail = line.split(emails[0])[0];
      const { firstName, lastName } = parseName(beforeEmail.replace(/[^\w\s]/g, ' ').trim());
      record.firstName = firstName || record.firstName;
      record.lastName = lastName || record.lastName;
      
      if (record.firstName || record.email) {
        records.push(record);
      }
    }
  }
  
  return records;
}

/**
 * Parse feedback/survey page
 */
function parseFeedbackPage(text, pageNum) {
  const records = [];
  const pageContext = { eventName: 'Green Dog CE Event', pageType: 'feedback' };
  
  // Feedback pages often have ratings and comments
  // Try to link them to people
  const blocks = text.split(/(?=\d{1,2}\/\d{1,2}\/\d{2,4})|(?=Timestamp)/i);
  
  for (const block of blocks) {
    if (block.length < 20) continue;
    
    const record = extractRecordFromBlock(block, pageContext);
    record.notes = 'Feedback: ' + block.slice(0, 500).replace(/\n/g, ' ').trim();
    
    if (record.email || (record.firstName && record.lastName)) {
      records.push(record);
    }
  }
  
  return records;
}

/**
 * Merge two records, preferring non-empty values
 */
function mergeRecords(existing, newRecord) {
  const merged = { ...existing };
  
  // Simple fields - prefer non-empty
  for (const field of ['firstName', 'lastName', 'email', 'phone', 'clinic', 'licenseNumber', 'dietary', 'allergies', 'paymentRef']) {
    if (newRecord[field] && (!existing[field] || existing[field].length < newRecord[field].length)) {
      merged[field] = newRecord[field];
    }
  }
  
  // Role - prefer specific over Unknown
  if (newRecord.role !== 'Unknown' && existing.role === 'Unknown') {
    merged.role = newRecord.role;
  }
  
  // Arrays - merge unique values
  merged.states = [...new Set([...(existing.states || []), ...(newRecord.states || [])])];
  merged.events = [...new Set([...(existing.events || []), ...(newRecord.events || [])])];
  
  // Attendance status - prefer more specific
  const statusPriority = { 'attended': 4, 'no_show': 3, 'cancelled': 2, 'registered': 1 };
  if ((statusPriority[newRecord.attendanceStatus] || 0) > (statusPriority[existing.attendanceStatus] || 0)) {
    merged.attendanceStatus = newRecord.attendanceStatus;
  }
  
  // Payment - prefer true/false over null
  if (newRecord.isPaid !== null && existing.isPaid === null) {
    merged.isPaid = newRecord.isPaid;
  }
  
  // Append comments and notes
  if (newRecord.comments && !existing.comments?.includes(newRecord.comments)) {
    merged.comments = [existing.comments, newRecord.comments].filter(Boolean).join(' | ');
  }
  if (newRecord.notes && !existing.notes?.includes(newRecord.notes)) {
    merged.notes = [existing.notes, newRecord.notes].filter(Boolean).join(' | ');
  }
  
  // How heard - append if different
  if (newRecord.howHeard && !existing.howHeard?.includes(newRecord.howHeard)) {
    merged.howHeard = [existing.howHeard, newRecord.howHeard].filter(Boolean).join(', ');
  }
  
  return merged;
}

/**
 * Main parsing function
 */
async function parsePDF() {
  console.log('📄 Reading CE Tracker PDF...\n');
  
  const dataBuffer = fs.readFileSync(PDF_PATH);
  const parser = new PDFParse({ data: dataBuffer });
  const result = await parser.getText();
  
  console.log(`📊 PDF Stats:`);
  console.log(`   - Pages: ${result.pages.length}`);
  console.log(`   - Text length: ${result.text.length} characters\n`);
  
  // Split by pages
  const pages = result.pages.map(p => p.text);
  
  console.log(`🔍 Processing ${pages.length} sections...\n`);
  
  const allRecords = [];
  
  for (let i = 0; i < pages.length; i++) {
    const pageText = pages[i];
    if (pageText.length < 50) continue; // Skip empty pages
    
    // Determine page type and parse accordingly
    let pageRecords = [];
    
    if (/feedback|survey|rating|satisfied/i.test(pageText.slice(0, 200))) {
      pageRecords = parseFeedbackPage(pageText, i + 1);
    } else if (/attendance|check.?in|arrived|present/i.test(pageText.slice(0, 200))) {
      pageRecords = parseTablePage(pageText, i + 1);
    } else {
      pageRecords = parseRegistrationPage(pageText, i + 1);
    }
    
    allRecords.push(...pageRecords);
  }
  
  console.log(`📥 Extracted ${allRecords.length} raw records\n`);
  
  // Deduplicate and merge
  let mergeCount = 0;
  const unmatchable = [];
  
  for (const record of allRecords) {
    const matchKey = generateMatchKey(record);
    
    if (!matchKey) {
      unmatchable.push(record);
      continue;
    }
    
    if (normalizedRecords.has(matchKey)) {
      // Merge with existing
      const existing = normalizedRecords.get(matchKey);
      normalizedRecords.set(matchKey, mergeRecords(existing, record));
      mergeCount++;
    } else {
      normalizedRecords.set(matchKey, record);
    }
  }
  
  console.log(`🔄 Merged ${mergeCount} duplicate records`);
  console.log(`⚠️  ${unmatchable.length} records without matching identifiers\n`);
  
  // Try to match unmatchable records by fuzzy name matching
  for (const record of unmatchable) {
    if (!record.firstName && !record.lastName) continue;
    
    const nameLower = normalizeName(record.firstName + ' ' + record.lastName);
    let matched = false;
    
    for (const [key, existing] of normalizedRecords.entries()) {
      const existingName = normalizeName(existing.firstName + ' ' + existing.lastName);
      if (existingName && nameLower && existingName.includes(nameLower.split(' ')[0])) {
        normalizedRecords.set(key, mergeRecords(existing, record));
        matched = true;
        mergeCount++;
        break;
      }
    }
    
    if (!matched && (record.firstName || record.lastName)) {
      // Create new record anyway
      const newKey = `orphan:${Date.now()}:${Math.random()}`;
      normalizedRecords.set(newKey, record);
    }
  }
  
  return {
    records: Array.from(normalizedRecords.values()),
    stats: {
      totalExtracted: allRecords.length,
      merged: mergeCount,
      final: normalizedRecords.size,
      unmatchable: unmatchable.filter(r => !r.firstName && !r.lastName).length
    }
  };
}

/**
 * Generate SQL for migration
 */
function generateSQL(records) {
  const statements = [];
  
  statements.push(`-- =====================================================`);
  statements.push(`-- CE TRACKER PDF MIGRATION`);
  statements.push(`-- Generated: ${new Date().toISOString()}`);
  statements.push(`-- Source: CE Tracker - Registration Responses.pdf`);
  statements.push(`-- Total Records: ${records.length}`);
  statements.push(`-- =====================================================\n`);
  
  for (const record of records) {
    // Map to education_visitors columns
    const firstName = (record.firstName || '').replace(/'/g, "''").slice(0, 100);
    const lastName = (record.lastName || '').replace(/'/g, "''").slice(0, 100);
    const email = (record.email || '').replace(/'/g, "''").slice(0, 255);
    const phone = (record.phone || '').replace(/'/g, "''").slice(0, 20);
    const organization = (record.clinic || '').replace(/'/g, "''").slice(0, 200);
    const program = (record.events.join(', ') || 'Green Dog CE Event').replace(/'/g, "''").slice(0, 200);
    const leadSource = `CE Tracker PDF Import - ${record.howHeard || 'Unknown'}`.replace(/'/g, "''").slice(0, 200);
    
    // Build notes from various fields
    let notes = [];
    if (record.role && record.role !== 'Unknown') notes.push(`Role: ${record.role}`);
    if (record.states.length) notes.push(`States: ${record.states.join(', ')}`);
    if (record.licenseNumber) notes.push(`License: ${record.licenseNumber}`);
    if (record.dietary) notes.push(`Dietary: ${record.dietary}`);
    if (record.allergies) notes.push(`Allergies: ${record.allergies}`);
    if (record.comments) notes.push(`Comments: ${record.comments}`);
    if (record.notes) notes.push(record.notes);
    if (record.isPaid === true) notes.push('Payment: Paid');
    if (record.isPaid === false) notes.push('Payment: Refunded/Gifted');
    if (record.attendanceStatus !== 'registered') notes.push(`Attendance: ${record.attendanceStatus}`);
    
    const notesStr = notes.join(' | ').replace(/'/g, "''").slice(0, 2000);
    
    // Determine visitor type
    let visitorType = 'ce_attendee';
    if (record.role === 'Student') visitorType = 'student';
    if (/extern/i.test(program)) visitorType = 'extern';
    if (/intern/i.test(program)) visitorType = 'intern';
    
    // Skip records with no name
    if (!firstName && !lastName) {
      statements.push(`-- Skipped: No name - Email: ${email || 'none'}`);
      continue;
    }
    
    // Check for existing record by email first, then insert
    if (email) {
      statements.push(`
-- ${firstName} ${lastName}
INSERT INTO education_visitors (first_name, last_name, email, phone, organization_name, program_name, lead_source, notes, visitor_type, is_active)
SELECT '${firstName}', '${lastName}', '${email}', ${phone ? `'${phone}'` : 'NULL'}, ${organization ? `'${organization}'` : 'NULL'}, '${program}', '${leadSource}', '${notesStr}', '${visitorType}', true
WHERE NOT EXISTS (SELECT 1 FROM education_visitors WHERE email = '${email}');`);
    } else {
      statements.push(`
-- ${firstName} ${lastName} (no email)
INSERT INTO education_visitors (first_name, last_name, phone, organization_name, program_name, lead_source, notes, visitor_type, is_active)
SELECT '${firstName}', '${lastName}', ${phone ? `'${phone}'` : 'NULL'}, ${organization ? `'${organization}'` : 'NULL'}, '${program}', '${leadSource}', '${notesStr}', '${visitorType}', true
WHERE NOT EXISTS (SELECT 1 FROM education_visitors WHERE first_name = '${firstName}' AND last_name = '${lastName}' AND (phone = '${phone}' OR phone IS NULL));`);
    }
  }
  
  return statements.join('\n');
}

/**
 * Main execution
 */
async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  CE TRACKER PDF PARSER & MIGRATION SCRIPT');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  try {
    // Check if PDF exists
    if (!fs.existsSync(PDF_PATH)) {
      console.error(`❌ PDF not found at: ${PDF_PATH}`);
      process.exit(1);
    }
    
    // Parse PDF
    const result = await parsePDF();
    
    console.log('═══════════════════════════════════════════════════════════');
    console.log('  PARSING SUMMARY');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`  📊 Total raw records extracted: ${result.stats.totalExtracted}`);
    console.log(`  🔄 Records merged: ${result.stats.merged}`);
    console.log(`  ✅ Final unique records: ${result.stats.final}`);
    console.log(`  ⚠️  Unmatchable (no identifiers): ${result.stats.unmatchable}`);
    console.log('═══════════════════════════════════════════════════════════\n');
    
    // Show sample records
    console.log('📋 Sample Records (first 5):');
    for (const record of result.records.slice(0, 5)) {
      console.log(`   - ${record.firstName} ${record.lastName}`);
      console.log(`     Email: ${record.email || 'N/A'}`);
      console.log(`     Phone: ${record.phone || 'N/A'}`);
      console.log(`     Role: ${record.role}`);
      console.log(`     Events: ${record.events.join(', ') || 'N/A'}`);
      console.log('');
    }
    
    // Flag records missing both email and phone
    const flagged = result.records.filter(r => !r.email && !r.phone);
    console.log(`🚩 Records missing both email AND phone: ${flagged.length}`);
    
    // Generate SQL migration
    const sql = generateSQL(result.records);
    const sqlPath = path.join(__dirname, '../supabase/migrations/086_ce_tracker_import.sql');
    fs.writeFileSync(sqlPath, sql);
    
    console.log(`\n✅ Migration SQL written to: ${sqlPath}`);
    console.log('\nNext steps:');
    console.log('  1. Review the migration file');
    console.log('  2. Run: npx supabase db push');
    console.log('  3. Commit and deploy');
    
    // Also output JSON for debugging
    const jsonPath = path.join(__dirname, '../ce-tracker-parsed.json');
    fs.writeFileSync(jsonPath, JSON.stringify(result.records, null, 2));
    console.log(`\n📄 Debug JSON written to: ${jsonPath}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main();
