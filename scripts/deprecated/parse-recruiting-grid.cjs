/**
 * Parse 2025 NEW GD RECRUITING GRID PDF
 * Extracts candidate data and generates SQL for database insertion
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Get the PDF content using pdftotext
const pdfPath = path.join(__dirname, '../public/2025 NEW GD RECRUITING GRID - All In House Positions.pdf');
let rawContent;

try {
  rawContent = execSync(`pdftotext -layout "${pdfPath}" -`, { maxBuffer: 10 * 1024 * 1024 }).toString();
} catch (e) {
  console.error('Error reading PDF:', e);
  process.exit(1);
}

// Store all candidates
const candidates = [];

// Define position mappings to job_position codes
const positionMap = {
  'EXOTICS RVT': { title: 'Exotics RVT', code: 'EXOT_TECH' },
  'VET TECH': { title: 'Veterinary Technician', code: 'VT' },
  'NAD TECH': { title: 'Dental Technician', code: 'DENT_TECH' },
  'IN HOUSE CSR': { title: 'Customer Service Representative', code: 'CSR' },
  'JANITOR': { title: 'Facilities/Janitorial', code: 'JANITOR' },
  'MARKETING': { title: 'Marketing', code: 'MKT' },
  'Marketing': { title: 'Marketing', code: 'MKT' }
};

// Phone number regex
const phoneRegex = /\(?(\d{3})\)?[-.\s]?(\d{3})[-.\s]?(\d{4})/;

// Email regex - more specific
const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.(com|net|org|edu|gov|io|vet|info|co|me|yahoo|gmail|outlook|hotmail|icloud|live))/gi;

// Helper to clean text
function cleanText(text) {
  if (!text) return null;
  return text.replace(/\s+/g, ' ').trim();
}

// Helper to extract phone
function extractPhone(text) {
  // Look for multiple phone patterns
  const matches = text.match(/\(?(\d{3})\)?[-.\s]?(\d{3})[-.\s]?(\d{4})/g);
  if (matches) {
    for (const match of matches) {
      const cleaned = match.replace(/[^\d]/g, '');
      if (cleaned.length === 10) {
        return `(${cleaned.slice(0,3)}) ${cleaned.slice(3,6)}-${cleaned.slice(6)}`;
      }
    }
  }
  return null;
}

// Helper to extract email - more carefully
function extractEmail(text) {
  const matches = text.match(emailRegex);
  if (matches && matches.length > 0) {
    // Filter out invalid patterns
    for (const email of matches) {
      const lower = email.toLowerCase();
      // Skip placeholder emails
      if (lower.includes('indeedemail') || lower === 'email') continue;
      // Validate basic format
      if (email.includes('@') && email.includes('.')) {
        return lower;
      }
    }
  }
  return null;
}

// Determine status from notes
function determineStatus(text, statusCol) {
  const lowerText = text.toLowerCase();
  const lowerStatus = (statusCol || '').toLowerCase();
  
  // Check status column first
  if (lowerStatus.includes('hire') && !lowerStatus.includes('no hire')) {
    return 'hired';
  }
  
  // Then check full text
  if (lowerText.includes('hired!!') || lowerText.includes('signed offer') || lowerText.includes('signed her offer') || lowerText.includes('was hired')) {
    return 'hired';
  }
  if (lowerText.includes('quit')) {
    return 'rejected'; // mapped from 'withdrawn' - not supported in remote DB
  }
  if (lowerText.includes('no hire') || lowerText.includes('pass') || lowerText.includes('declined') || 
      lowerText.includes('no response') || lowerText.includes('no show') || lowerText.includes('accepted offer elsewhere')) {
    return 'rejected';
  }
  if (lowerText.includes('shadow interview') || lowerText.includes('in person interview') || 
      lowerText.includes('phoner') || lowerText.includes('phone interview') || lowerText.includes('observation')) {
    return 'interview';
  }
  if (lowerText.includes('decision needed') || lowerText.includes('reached out') || 
      lowerText.includes('pending response') || lowerText.includes('scheduled')) {
    return 'screening';
  }
  if (lowerText.includes('new lead') || lowerText.includes('applied')) {
    return 'new';
  }
  
  return 'new';
}

// Extract source from text
function extractSource(text) {
  const lowerText = text.toLowerCase();
  
  if (lowerText.includes('indeed')) return 'Indeed';
  if (lowerText.includes('ziprecruiter')) return 'ZipRecruiter';
  if (lowerText.includes('gd website') || lowerText.includes('gdd website')) return 'GreenDog Website';
  if (lowerText.includes('personal referral') || lowerText.includes('referral')) return 'Personal Referral';
  if (lowerText.includes('mash')) return 'MASH Referral';
  
  return 'Indeed'; // Default
}

// Parse stars rating
function parseRating(text) {
  const filled = (text.match(/★/g) || []).length;
  return filled;
}

// Clean up name
function cleanName(name) {
  if (!name) return '';
  // Remove quotes, parentheses, and extra spaces
  return name.replace(/["""()]/g, '').replace(/\s+/g, ' ').trim();
}

// Main parsing logic - improved
const lines = rawContent.split('\n');
let currentPosition = null;
let lineBuffer = [];

// First pass: collect all potential candidate lines
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const trimmedLine = line.trim();
  
  if (!trimmedLine) continue;
  
  // Detect position sections
  for (const [key, value] of Object.entries(positionMap)) {
    // Position header detection - appears at start of line as section header
    if (trimmedLine === key || (trimmedLine.startsWith(key) && trimmedLine.length < key.length + 10)) {
      currentPosition = key;
    }
  }
  
  // Look for candidate patterns with a name followed by position
  const namePositionPattern = /^([A-Z][a-zA-Z]+(?:\s+[A-Z](?:\.|[a-z]+)?)?(?:\s+[A-Z][a-z]+)?(?:\s+[A-Z][a-z]+)?)\s+(EXOTICS RVT|VET TECH|NAD TECH|IN HOUSE CSR|JANITOR|Marketing)/;
  const match = line.match(namePositionPattern);
  
  if (match) {
    const fullName = cleanName(match[1]);
    const position = match[2];
    
    // Skip placeholder/template entries
    if (fullName === 'Applicant' || fullName === 'Email' || fullName === 'File' || fullName === 'Phone' || fullName === 'NEED') {
      continue;
    }
    
    // Collect following lines for context (up to 10 lines or until next candidate)
    const contextLines = [line];
    for (let j = i + 1; j < Math.min(i + 15, lines.length); j++) {
      const nextLine = lines[j];
      const nextMatch = nextLine.match(namePositionPattern);
      if (nextMatch) break; // Hit next candidate
      contextLines.push(nextLine);
    }
    const context = contextLines.join(' ');
    
    const nameParts = fullName.split(/\s+/);
    let firstName = nameParts[0];
    let lastName = nameParts.slice(1).join(' ');
    
    // Handle single-name entries
    if (!lastName) lastName = '';
    
    const candidate = {
      first_name: firstName,
      last_name: lastName,
      position: positionMap[position]?.title || position,
      position_code: positionMap[position]?.code || null,
      email: extractEmail(context),
      phone: extractPhone(context),
      status: determineStatus(context, ''),
      notes: null,
      source: extractSource(context),
      rating: parseRating(context)
    };
    
    // Extract notes (date-stamped entries)
    const notesMatch = context.match(/\d{1,2}\/\d{1,2}\/\d{2,4}[-_][A-Z]{2}[^★☆@]{10,}/);
    if (notesMatch) {
      candidate.notes = cleanText(notesMatch[0].substring(0, 400));
    }
    
    candidates.push(candidate);
  }
}

// Deduplicate and validate
const seen = new Map();
const validCandidates = [];

for (const c of candidates) {
  // Must have a valid first name
  if (!c.first_name || c.first_name.length < 2) continue;
  
  // Create dedup key
  const key = `${c.first_name}_${c.last_name}`.toLowerCase();
  
  // If we've seen this candidate, merge data
  if (seen.has(key)) {
    const existing = seen.get(key);
    if (!existing.email && c.email) existing.email = c.email;
    if (!existing.phone && c.phone) existing.phone = c.phone;
    if (c.rating > existing.rating) existing.rating = c.rating;
    continue;
  }
  
  seen.set(key, c);
  validCandidates.push(c);
}

console.log(`\n=== Parsed ${validCandidates.length} unique candidates ===\n`);

// Group by position for reporting
const byPosition = {};
validCandidates.forEach(c => {
  if (!byPosition[c.position]) byPosition[c.position] = [];
  byPosition[c.position].push(c);
});

for (const [pos, cands] of Object.entries(byPosition)) {
  console.log(`${pos}: ${cands.length} candidates`);
}

// Generate SQL - simplified version without ON CONFLICT
let sql = `-- =====================================================
-- Migration: Seed Real Recruiting Data from 2025 GD Grid
-- Generated: ${new Date().toISOString()}
-- Total Candidates: ${validCandidates.length}
-- =====================================================

-- First, ensure JANITOR and MKT job positions exist
INSERT INTO public.job_positions (title, code, is_manager) 
SELECT 'Janitor/Facilities', 'JANITOR', false
WHERE NOT EXISTS (SELECT 1 FROM public.job_positions WHERE code = 'JANITOR');

INSERT INTO public.job_positions (title, code, is_manager) 
SELECT 'Marketing Coordinator', 'MKT', false
WHERE NOT EXISTS (SELECT 1 FROM public.job_positions WHERE code = 'MKT');

-- Clear existing mock/seed data ONLY (preserving any real data)
DELETE FROM public.onboarding_checklist WHERE candidate_id IN (
  SELECT id FROM public.candidates 
  WHERE email LIKE '%@email.com' OR email LIKE 'candidate%@greendog.vet'
);
DELETE FROM public.candidate_notes WHERE candidate_id IN (
  SELECT id FROM public.candidates 
  WHERE email LIKE '%@email.com' OR email LIKE 'candidate%@greendog.vet'
);
DELETE FROM public.candidate_documents WHERE candidate_id IN (
  SELECT id FROM public.candidates 
  WHERE email LIKE '%@email.com' OR email LIKE 'candidate%@greendog.vet'
);
DELETE FROM public.candidate_skills WHERE candidate_id IN (
  SELECT id FROM public.candidates 
  WHERE email LIKE '%@email.com' OR email LIKE 'candidate%@greendog.vet'
);
DELETE FROM public.candidates 
WHERE email LIKE '%@email.com' OR email LIKE 'candidate%@greendog.vet';

-- Insert real candidates from 2025 GD Recruiting Grid
-- Using INSERT ... SELECT WHERE NOT EXISTS to avoid conflicts
`;

validCandidates.forEach((c, idx) => {
  const firstName = (c.first_name || '').replace(/'/g, "''");
  const lastName = (c.last_name || '').replace(/'/g, "''");
  
  // Generate unique email if missing
  let email = c.email;
  if (!email) {
    const cleanFirst = firstName.toLowerCase().replace(/[^a-z]/g, '');
    const cleanLast = lastName.toLowerCase().replace(/[^a-z]/g, '');
    email = `${cleanFirst}.${cleanLast}@candidate.greendog.vet`;
  }
  email = email.toLowerCase().replace(/'/g, "''");
  
  const phone = c.phone ? c.phone.replace(/'/g, "''") : null;
  const status = c.status || 'new';
  const source = (c.source || '2025 GD Grid').replace(/'/g, "''");
  const notes = c.notes ? c.notes.replace(/'/g, "''").substring(0, 400) : null;
  const positionCode = c.position_code || null;
  
  // Calculate applied_at based on status
  let daysAgo;
  switch (status) {
    case 'hired': daysAgo = Math.floor(Math.random() * 30) + 30; break;
    case 'rejected': daysAgo = Math.floor(Math.random() * 60) + 14; break;
    case 'interview': daysAgo = Math.floor(Math.random() * 14) + 7; break;
    case 'screening': daysAgo = Math.floor(Math.random() * 10) + 3; break;
    default: daysAgo = Math.floor(Math.random() * 7) + 1; break;
  }
  
  sql += `
INSERT INTO public.candidates (
  first_name, last_name, email, phone, status, source, notes, 
  target_position_id, applied_at, created_at, updated_at
)
SELECT 
  '${firstName}',
  '${lastName}',
  '${email}',
  ${phone ? `'${phone}'` : 'NULL'},
  '${status}',
  '${source}',
  ${notes ? `'${notes}'` : 'NULL'},
  ${positionCode ? `(SELECT id FROM public.job_positions WHERE code = '${positionCode}' LIMIT 1)` : 'NULL'},
  NOW() - INTERVAL '${daysAgo} days',
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.candidates WHERE email = '${email}');
`;
});

// Add onboarding checklists for hired candidates
sql += `

-- Create onboarding checklists for hired candidates
INSERT INTO public.onboarding_checklist (candidate_id, contract_sent, contract_signed, background_check, uniform_ordered, email_created, start_date)
SELECT 
  c.id, 
  true, 
  true, 
  true, 
  true, 
  false,
  CURRENT_DATE + INTERVAL '7 days'
FROM public.candidates c
WHERE c.status = 'hired' 
  AND c.source LIKE '%GD Grid%'
  AND NOT EXISTS (SELECT 1 FROM public.onboarding_checklist oc WHERE oc.candidate_id = c.id);

-- Create onboarding checklists for offer-stage candidates
INSERT INTO public.onboarding_checklist (candidate_id, contract_sent, contract_signed, background_check, start_date)
SELECT 
  c.id, 
  true, 
  false, 
  false,
  CURRENT_DATE + INTERVAL '14 days'
FROM public.candidates c
WHERE c.status = 'offer' 
  AND c.source LIKE '%GD Grid%'
  AND NOT EXISTS (SELECT 1 FROM public.onboarding_checklist oc WHERE oc.candidate_id = c.id);
`;

// Write SQL file
const sqlPath = path.join(__dirname, '../supabase/migrations/091_seed_recruiting_grid.sql');
fs.writeFileSync(sqlPath, sql);

console.log(`\n✅ Generated migration file: ${sqlPath}`);
console.log(`\nSummary:`);
console.log(`- Total candidates: ${validCandidates.length}`);
console.log(`- With email: ${validCandidates.filter(c => c.email).length}`);
console.log(`- With phone: ${validCandidates.filter(c => c.phone).length}`);
console.log(`\nBy Status:`);
console.log(`- Hired: ${validCandidates.filter(c => c.status === 'hired').length}`);
console.log(`- Interview: ${validCandidates.filter(c => c.status === 'interview').length}`);
console.log(`- Screening: ${validCandidates.filter(c => c.status === 'screening').length}`);
console.log(`- New: ${validCandidates.filter(c => c.status === 'new').length}`);
console.log(`- Rejected: ${validCandidates.filter(c => c.status === 'rejected').length}`);
console.log(`- Withdrawn: ${validCandidates.filter(c => c.status === 'withdrawn').length}`);

// Also output a JSON file for verification
const jsonPath = path.join(__dirname, 'recruiting-grid-parsed.json');
fs.writeFileSync(jsonPath, JSON.stringify(validCandidates, null, 2));
console.log(`\n📄 JSON data saved to: ${jsonPath}`);
