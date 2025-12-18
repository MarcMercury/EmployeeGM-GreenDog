const data = require('/tmp/pet-businesses.json');

// Filter out obviously bad entries
const cleanData = data.filter(b => {
  // Skip if name looks like an address or is too short
  if (b.name.match(/^\d+\s+/)) return false;
  if (b.name.match(/^[A-Z]{2}\s+\d{5}/)) return false;
  if (b.name.match(/, CA \d{5}/)) return false;
  if (b.name.length < 3) return false;
  if (b.name.toLowerCase() === 'groomer') return false;
  if (b.name.toLowerCase().includes('westside')) return b.name.toLowerCase() !== 'westside';
  return true;
});

// Map business types to marketing_partner_type enum
function mapType(businessType) {
  const bt = businessType.toLowerCase();
  if (bt.includes('rescue') || bt.includes('shelter')) return 'rescue';
  if (bt.includes('groomer') || bt.includes('daycare') || bt.includes('hotel') || bt.includes('retail')) return 'pet_business';
  if (bt.includes('trainer')) return 'pet_business';
  return 'other';
}

// Clean phone numbers
function cleanPhone(phone) {
  if (!phone) return null;
  // Remove non-digits except for leading + 
  let cleaned = phone.replace(/[^0-9+]/g, '');
  // If it's an address misinterpreted as phone, skip it
  if (cleaned.length > 15) return null;
  // Format as (xxx) xxx-xxxx if 10 digits
  if (cleaned.length === 10) {
    return '(' + cleaned.slice(0,3) + ') ' + cleaned.slice(3,6) + '-' + cleaned.slice(6);
  }
  if (cleaned.length === 11 && cleaned[0] === '1') {
    return '(' + cleaned.slice(1,4) + ') ' + cleaned.slice(4,7) + '-' + cleaned.slice(7);
  }
  return phone;
}

// Clean email (remove embedded addresses)
function cleanEmail(email) {
  if (!email) return null;
  // Extract just the email part
  const match = email.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/);
  return match ? match[1].toLowerCase() : null;
}

// Escape for SQL
function esc(str) {
  if (!str) return 'NULL';
  return "'" + str.replace(/'/g, "''") + "'";
}

console.log('-- =====================================================');
console.log('-- Pet Related Businesses Import');
console.log('-- Imported from: GDD Referral Master Lists - PET RELATED BUSINESS LIST.pdf');
console.log('-- Total businesses: ' + cleanData.length);
console.log('-- =====================================================');
console.log('');
console.log('INSERT INTO marketing_partners (name, partner_type, status, contact_phone, contact_email, address, services_provided, notes)');
console.log('VALUES');

const values = cleanData.map((b, i) => {
  const name = b.name.trim();
  const phone = cleanPhone(b.phone);
  const email = cleanEmail(b.email);
  const address = b.address ? b.address.trim() : null;
  const partnerType = mapType(b.businessType);
  const services = b.businessType;
  const notes = [];
  if (b.zone) notes.push('Zone: ' + b.zone);
  if (b.priority) notes.push('Priority: ' + b.priority);
  if (b.notes) notes.push(b.notes.replace(/^(VISIT FOR|Visit|YES - by \w+)\s*/i, '').trim() || b.notes);
  const notesStr = notes.filter(n => n).join('; ');
  
  const comma = i < cleanData.length - 1 ? ',' : ';';
  return '  (' + esc(name) + ', ' + esc(partnerType) + ', ' + esc('prospect') + ', ' + esc(phone) + ', ' + esc(email) + ', ' + esc(address) + ', ' + esc(services) + ', ' + (notesStr ? esc(notesStr) : 'NULL') + ')' + comma;
});

values.forEach(v => console.log(v));
