/**
 * Marketing Data Migration: Excel Parser
 * Parses the Marketing Spreadsheets.xlsx and exports clean CSVs
 * for database import
 */

import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const INPUT_FILE = path.join(__dirname, '../../data/Marketing Spreadsheets.xlsx');
const OUTPUT_DIR = path.join(__dirname, '../../data/marketing/parsed');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const workbook = XLSX.readFile(INPUT_FILE);

console.log('='.repeat(60));
console.log('MARKETING DATA MIGRATION - Excel Parser');
console.log('='.repeat(60));
console.log(`\nInput: ${INPUT_FILE}`);
console.log(`Output: ${OUTPUT_DIR}\n`);

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function cleanString(val: any): string {
  if (val === null || val === undefined) return '';
  return String(val).trim();
}

function parseFollowerCount(val: string): number | null {
  if (!val) return null;
  const cleaned = val.toUpperCase().replace(/,/g, '');
  if (cleaned.includes('M')) {
    return Math.round(parseFloat(cleaned.replace('M', '')) * 1000000);
  }
  if (cleaned.includes('K')) {
    return Math.round(parseFloat(cleaned.replace('K', '')) * 1000);
  }
  const num = parseInt(cleaned, 10);
  return isNaN(num) ? null : num;
}

function extractEmail(val: string): string {
  if (!val) return '';
  // Extract first valid email from a string that might contain multiple
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const matches = val.match(emailRegex);
  return matches ? matches[0].toLowerCase() : '';
}

function extractInstagramHandle(val: string): string {
  if (!val) return '';
  // Remove @ prefix if present, extract handle from URL if needed
  let handle = val.trim();
  if (handle.includes('instagram.com/')) {
    const match = handle.match(/instagram\.com\/([^/?]+)/);
    if (match) handle = match[1];
  }
  return handle.replace('@', '').toLowerCase();
}

function parseExcelDate(val: any): string | null {
  if (!val) return null;
  if (typeof val === 'number') {
    // Excel serial date
    const date = XLSX.SSF.parse_date_code(val);
    if (date) {
      return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
    }
  }
  if (typeof val === 'string') {
    // Try to parse various date formats
    const d = new Date(val);
    if (!isNaN(d.getTime())) {
      return d.toISOString().split('T')[0];
    }
  }
  return null;
}

function writeCSV(filename: string, headers: string[], rows: any[][]): void {
  const csvContent = [
    headers.join(','),
    ...rows.map(row => 
      row.map(cell => {
        const str = String(cell ?? '').replace(/"/g, '""');
        return str.includes(',') || str.includes('"') || str.includes('\n') 
          ? `"${str}"` 
          : str;
      }).join(',')
    )
  ].join('\n');
  
  const filepath = path.join(OUTPUT_DIR, filename);
  fs.writeFileSync(filepath, csvContent);
  console.log(`  ✅ ${filename} - ${rows.length} rows`);
}

// ============================================================
// SHEET PARSERS
// ============================================================

function parseResourcesPW(): void {
  console.log('\n📁 Parsing: RESOURCES & PW');
  const sheet = workbook.Sheets['RESOURCES & PW'];
  const data: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  
  // Headers are in row 0: m, Site, Username, email, password, Biz Phone#, Notes, etc
  const headers = ['category', 'site', 'username', 'email', 'password', 'phone', 'notes'];
  const rows: any[][] = [];
  
  let currentCategory = '';
  for (let i = 2; i < data.length; i++) {
    const row = data[i];
    if (!row[1] && !row[2]) continue; // Skip empty rows
    
    // Check if this is a category header (all caps, no other data)
    if (row[1] && !row[2] && !row[3] && String(row[1]).toUpperCase() === String(row[1])) {
      currentCategory = cleanString(row[1]);
      continue;
    }
    
    rows.push([
      currentCategory || 'General',
      cleanString(row[1]), // Site
      cleanString(row[2]), // Username
      cleanString(row[3]), // Email
      cleanString(row[4]), // Password
      cleanString(row[5]), // Phone
      cleanString(row[6])  // Notes
    ]);
  }
  
  writeCSV('resources_passwords.csv', headers, rows);
}

function parseMarketingContacts(): void {
  console.log('\n📁 Parsing: 2025 ALL MARKETING CONTACTS');
  const sheet = workbook.Sheets['2025 ALL MARKETING CONTACTS'];
  const data: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  
  // Headers in row 0: Column 1, Business Name, Contact, Phone #, Email, Business Type, Service Provided
  const headers = ['notes', 'business_name', 'contact_name', 'phone', 'email', 'business_type', 'services_provided', 'tags'];
  const rows: any[][] = [];
  
  let currentSection = '';
  for (let i = 2; i < data.length; i++) {
    const row = data[i];
    const businessName = cleanString(row[1]);
    
    if (!businessName) continue;
    
    // Detect section headers (e.g., "CHAMBERS OF COMMERCE & ASSOCIATIONS")
    if (businessName.toUpperCase() === businessName && !row[2]) {
      currentSection = businessName;
      continue;
    }
    
    rows.push([
      cleanString(row[0]), // Notes
      businessName,
      cleanString(row[2]), // Contact
      cleanString(row[3]), // Phone
      extractEmail(String(row[4])), // Email
      cleanString(row[5]), // Business Type
      cleanString(row[6]), // Services
      currentSection // Tags/Section
    ]);
  }
  
  writeCSV('marketing_contacts.csv', headers, rows);
}

function parseInfluencers(): void {
  console.log('\n📁 Parsing: INFLUENCERS');
  const sheet = workbook.Sheets['INFLUENCERS'];
  const data: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  
  // Headers in row 1: Status/notes, Contact/Human Name, Pet Name, Phone #, Email, Agreement, 
  // Handle - Profile Links, # Followers, Content - What has been Posted
  const headers = [
    'status_notes', 'contact_name', 'pet_name', 'phone', 'email', 
    'agreement_details', 'instagram_handle', 'follower_count', 'content_notes', 
    'promo_code', 'location', 'source'
  ];
  const rows: any[][] = [];
  
  for (let i = 3; i < data.length; i++) {
    const row = data[i];
    const name = cleanString(row[1]);
    if (!name) continue;
    
    // Skip section headers
    if (name.toUpperCase() === name && name.includes('INFLUENCER')) continue;
    
    const handle = extractInstagramHandle(String(row[6]));
    const followers = parseFollowerCount(String(row[7]));
    
    rows.push([
      cleanString(row[0]), // Status notes
      name,
      cleanString(row[2]), // Pet name
      cleanString(row[3]), // Phone
      extractEmail(String(row[4])), // Email
      cleanString(row[5]), // Agreement
      handle,
      followers,
      cleanString(row[8]), // Content notes
      cleanString(row[9]), // Promo code
      cleanString(row[10]), // Location
      'INFLUENCERS_MASTER'
    ]);
  }
  
  writeCSV('influencers_master.csv', headers, rows);
}

function parseInventory(): void {
  console.log('\n📁 Parsing: Inventory');
  const sheet = workbook.Sheets['Inventory'];
  const data: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  
  // Headers in row 0: Notes, Contact, Item, Boxes, Venice, Sherman Oaks, Valley, Reorder Point, Last Ordered, Order Qty
  const headers = [
    'notes', 'contact', 'item_name', 'boxes_on_hand', 'quantity_venice', 
    'quantity_sherman_oaks', 'quantity_valley', 'reorder_point', 'last_ordered', 'order_quantity'
  ];
  const rows: any[][] = [];
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const itemName = cleanString(row[2]);
    if (!itemName) continue;
    
    rows.push([
      cleanString(row[0]), // Notes
      cleanString(row[1]), // Contact
      itemName,
      parseInt(String(row[3]).replace(/[^\d]/g, '')) || 0, // Boxes
      parseInt(String(row[4]).replace(/[^\d]/g, '')) || 0, // Venice
      parseInt(String(row[5]).replace(/[^\d]/g, '')) || 0, // Sherman Oaks
      parseInt(String(row[6]).replace(/[^\d]/g, '')) || 0, // Valley
      parseInt(String(row[7]).replace(/[^\d]/g, '')) || 100, // Reorder Point
      parseExcelDate(row[8]), // Last Ordered
      parseInt(String(row[9]).replace(/[^\d]/g, '')) || 0 // Order Qty
    ]);
  }
  
  writeCSV('inventory.csv', headers, rows);
}

function parseEventRecaps(): void {
  console.log('\n📁 Parsing: 2026 Event Recaps');
  const sheet = workbook.Sheets['2026 Event Recaps'];
  const data: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  
  // Headers in row 0: Event Name, Date, Location of Event, Clinic Event Serves, 
  // Cost of Event, # of Attendees, Leads Collected, Additional Feedback/Notes
  const headers = [
    'event_name', 'event_date', 'location', 'clinic', 'cost', 
    'attendees', 'leads_collected', 'notes', 'status', 'year'
  ];
  const rows: any[][] = [];
  
  let currentYear = '2026';
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const eventName = cleanString(row[0]);
    
    // Check for year markers
    if (eventName === '2025' || eventName === '2024' || eventName === '2026') {
      currentYear = eventName;
      continue;
    }
    
    if (!eventName) continue;
    
    const eventDate = parseExcelDate(row[1]);
    
    rows.push([
      eventName,
      eventDate,
      cleanString(row[2]), // Location
      cleanString(row[3]), // Clinic
      parseFloat(String(row[4]).replace(/[^\d.]/g, '')) || 0, // Cost
      parseInt(String(row[5]).replace(/[^\d]/g, '')) || 0, // Attendees
      parseInt(String(row[6]).replace(/[^\d]/g, '')) || 0, // Leads
      cleanString(row[7]), // Notes
      'completed', // Status - these are recaps so they're completed
      currentYear
    ]);
  }
  
  writeCSV('events_completed.csv', headers, rows);
}

function parseEventList(): void {
  console.log('\n📁 Parsing: 2026 Event List');
  const sheet = workbook.Sheets['2026 Event List'];
  const data: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  
  // Headers in row 0: Date, Month, Event Name, Event Type, Clinic, Owner(s)/Organizer
  const headers = [
    'event_date', 'month', 'event_name', 'event_type', 'clinic', 
    'organizer', 'description', 'status'
  ];
  const rows: any[][] = [];
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const eventName = cleanString(row[2]);
    if (!eventName) continue;
    
    const eventDate = parseExcelDate(row[0]);
    const eventType = cleanString(row[3]).toLowerCase();
    
    // Determine status based on event type
    let status = 'planned';
    if (eventType === 'awareness') status = 'awareness';
    else if (eventDate) {
      const d = new Date(eventDate);
      if (d < new Date()) status = 'completed';
      else status = 'scheduled';
    }
    
    rows.push([
      eventDate,
      cleanString(row[1]), // Month
      eventName,
      cleanString(row[3]), // Event Type
      cleanString(row[4]), // Clinic
      cleanString(row[5]), // Organizer
      cleanString(row[6]), // Description
      status
    ]);
  }
  
  writeCSV('events_scheduled.csv', headers, rows);
}

function parsePetChewllaVendors(): void {
  console.log('\n📁 Parsing: 2024 PetChewlla - Vendors');
  const sheet = workbook.Sheets['2024 PetChewlla - Vendors'];
  const data: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  
  // This sheet has complex formatting - need to find the actual data rows
  // Looking for headers like: NAME, Business Name, Contact, Email, etc.
  
  const headers = [
    'vendor_name', 'business_name', 'contact_name', 'email', 'phone', 
    'instagram', 'notes', 'event_source'
  ];
  const rows: any[][] = [];
  
  // Find the header row (contains "NAME" or "Business")
  let headerRowIdx = -1;
  let colMap: Record<string, number> = {};
  
  for (let i = 0; i < Math.min(20, data.length); i++) {
    const row = data[i];
    for (let j = 0; j < row.length; j++) {
      const cell = String(row[j]).toUpperCase();
      if (cell.includes('BUSINESS NAME') || cell === 'NAME') {
        headerRowIdx = i;
        // Map column positions
        for (let k = 0; k < row.length; k++) {
          const h = String(row[k]).toUpperCase().trim();
          if (h.includes('NAME') && !h.includes('BUSINESS')) colMap['name'] = k;
          if (h.includes('BUSINESS')) colMap['business'] = k;
          if (h.includes('CONTACT')) colMap['contact'] = k;
          if (h.includes('EMAIL')) colMap['email'] = k;
          if (h.includes('PHONE')) colMap['phone'] = k;
          if (h.includes('INSTAGRAM') || h.includes('IG')) colMap['instagram'] = k;
          if (h.includes('NOTE')) colMap['notes'] = k;
        }
        break;
      }
    }
    if (headerRowIdx >= 0) break;
  }
  
  if (headerRowIdx < 0) {
    console.log('    ⚠️ Could not find header row, using fallback parsing');
    // Fallback: look for rows with email-like content
    for (let i = 5; i < data.length; i++) {
      const row = data[i];
      const rowStr = row.join(' ');
      if (rowStr.includes('@')) {
        const email = extractEmail(rowStr);
        const name = cleanString(row[1]) || cleanString(row[2]);
        if (name) {
          rows.push([
            name, '', '', email, '', '', '', 'PetChewlla_2024'
          ]);
        }
      }
    }
  } else {
    for (let i = headerRowIdx + 1; i < data.length; i++) {
      const row = data[i];
      const name = cleanString(row[colMap['name'] ?? 1]);
      const business = cleanString(row[colMap['business'] ?? 2]);
      
      if (!name && !business) continue;
      
      rows.push([
        name,
        business,
        cleanString(row[colMap['contact'] ?? 3]),
        extractEmail(String(row[colMap['email'] ?? 4])),
        cleanString(row[colMap['phone'] ?? 5]),
        extractInstagramHandle(String(row[colMap['instagram'] ?? 6])),
        cleanString(row[colMap['notes'] ?? 7]),
        'PetChewlla_2024'
      ]);
    }
  }
  
  writeCSV('vendors_petchewlla_2024.csv', headers, rows);
}

function parsePetChewllaInfluencers(): void {
  console.log('\n📁 Parsing: 2024 PetChewlla - Influencers');
  const sheet = workbook.Sheets['2024 PetChewlla - Influencers '];
  const data: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  
  const headers = [
    'contact_name', 'pet_name', 'email', 'phone', 'instagram_handle', 
    'follower_count', 'notes', 'source'
  ];
  const rows: any[][] = [];
  
  // Find data rows - look for rows with IG handles or emails
  for (let i = 5; i < data.length; i++) {
    const row = data[i];
    const rowStr = row.join(' ');
    
    // Skip empty rows
    if (!rowStr.trim()) continue;
    
    // Look for rows that have potential influencer data
    const hasEmail = rowStr.includes('@') && rowStr.includes('.');
    const hasHandle = rowStr.includes('instagram') || rowStr.match(/@\w+/);
    
    if (hasEmail || hasHandle) {
      const email = extractEmail(rowStr);
      let handle = '';
      let name = '';
      let followers: number | null = null;
      
      // Try to extract handle
      for (const cell of row) {
        const cellStr = String(cell);
        if (cellStr.includes('instagram.com') || (cellStr.startsWith('@') && cellStr.length > 2)) {
          handle = extractInstagramHandle(cellStr);
        }
        // Check for follower counts
        if (cellStr.match(/[\d.]+[kKmM]/) || (parseInt(cellStr) > 1000)) {
          followers = parseFollowerCount(cellStr);
        }
      }
      
      // Get name from early columns
      name = cleanString(row[1]) || cleanString(row[2]) || cleanString(row[3]);
      
      if (name || handle || email) {
        rows.push([
          name,
          '', // Pet name - extract if visible
          email,
          '', // Phone
          handle,
          followers,
          'From PetChewlla 2024',
          'PetChewlla_2024'
        ]);
      }
    }
  }
  
  writeCSV('influencers_petchewlla_2024.csv', headers, rows);
}

function parsePetChewllaStaff(): void {
  console.log('\n📁 Parsing: 2024 PetChewlla - Staff');
  const sheet = workbook.Sheets['2024 PetChewlla - Staff'];
  const data: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  
  const headers = ['name', 'role', 'notes', 'event_source'];
  const rows: any[][] = [];
  
  // This is likely a staff assignment list - extract names and roles
  for (let i = 5; i < data.length; i++) {
    const row = data[i];
    const name = cleanString(row[1]) || cleanString(row[2]);
    const role = cleanString(row[3]) || cleanString(row[4]);
    
    if (!name) continue;
    if (name.toUpperCase() === name && name.length > 20) continue; // Skip headers
    
    rows.push([
      name,
      role,
      '',
      'PetChewlla_2024'
    ]);
  }
  
  writeCSV('staff_petchewlla_2024.csv', headers, rows);
}

function parseGDLandVendors(): void {
  console.log('\n📁 Parsing: 25 GD LAND Vendors');
  const sheet = workbook.Sheets['25 GD LAND Vendors '];
  const data: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  
  const headers = [
    'category', 'business_name', 'contact_name', 'email', 'phone', 
    'instagram', 'notes', 'event_source'
  ];
  const rows: any[][] = [];
  
  let currentCategory = '';
  
  for (let i = 2; i < data.length; i++) {
    const row = data[i];
    
    // Check for category labels (RESCUES, FOOD & DRINK, etc.)
    const cat = cleanString(row[1]);
    if (cat && cat.toUpperCase() === cat && !row[5]) {
      currentCategory = cat;
      continue;
    }
    
    const businessName = cleanString(row[1]);
    const contactName = cleanString(row[5]); // Column F: NAME
    const email = extractEmail(String(row[6])); // Column G: EMAIL
    const phone = cleanString(row[7]); // Column H: PHONE
    
    if (!businessName && !contactName) continue;
    
    rows.push([
      currentCategory,
      businessName,
      contactName,
      email,
      phone,
      '', // Instagram
      '', // Notes
      'GD_LAND_2025'
    ]);
  }
  
  writeCSV('vendors_gd_land_2025.csv', headers, rows);
}

// ============================================================
// MAIN EXECUTION
// ============================================================

console.log('Processing sheets...\n');

parseResourcesPW();
parseMarketingContacts();
parseInfluencers();
parseInventory();
parseEventRecaps();
parseEventList();
parsePetChewllaVendors();
parsePetChewllaInfluencers();
parsePetChewllaStaff();
parseGDLandVendors();

console.log('\n' + '='.repeat(60));
console.log('✅ PARSING COMPLETE');
console.log('='.repeat(60));
console.log(`\nOutput files saved to: ${OUTPUT_DIR}`);
console.log('\nNext steps:');
console.log('  1. Review the CSV files for accuracy');
console.log('  2. Run the database migration script');
