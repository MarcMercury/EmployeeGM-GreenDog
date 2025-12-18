const { PDFParse } = require('pdf-parse');
const fs = require('fs');
const pdfBuffer = fs.readFileSync('public/GDD Referral Master Lists - PET RELATED BUSINESS LIST.pdf');
const uint8Array = new Uint8Array(pdfBuffer);
const parser = new PDFParse(uint8Array);
parser.getText().then(result => {
  const text = result.pages.map(p => p.text).join('\n');
  
  // Parse the businesses
  const businesses = [];
  const lines = text.split('\n');
  
  for (const line of lines) {
    // Skip header lines and empty lines
    if (line.includes('PARTNERED RESCUES') || 
        line.includes('VISIT TRACKER') || 
        line.startsWith('NAME') ||
        line.trim().length < 5 ||
        line.match(/^[CLEANED UP?]+$/) ||
        line.startsWith('Visit #')) continue;
    
    // Parse tab-separated values
    const parts = line.split('\t').map(p => p.trim()).filter(p => p);
    if (parts.length < 2) continue;
    
    let name = '';
    let businessType = '';
    let phone = '';
    let email = '';
    let address = '';
    let zone = '';
    let priority = '';
    let notes = '';
    
    // Try to extract data from the line
    // Format varies: some have "VISIT FOR 3/25" prefix, some have "YES - by X" prefix
    let startIdx = 0;
    
    // Remove prefixes
    if (parts[0].match(/^VISIT|^Visit|^YES/)) {
      notes = parts[0];
      startIdx = 1;
    }
    
    // Extract name
    if (parts.length > startIdx) {
      name = parts[startIdx];
      startIdx++;
    }
    
    // Look for business type keywords
    for (let i = startIdx; i < parts.length; i++) {
      const part = parts[i];
      
      // Zone detection
      if (part.match(/^AETNA$|^SO$|^VENICE$|^WESTSIDE$/i)) {
        zone = part;
        continue;
      }
      
      // Business type detection
      if (part.match(/^Retail|^Groomer|^Hotel|^Daycare|^Dog Shelter|^Other|^Trainer/i)) {
        businessType = part;
        continue;
      }
      
      // Priority
      if (part.match(/^HIGH$|^POTENTIAL$/i)) {
        priority = part;
        continue;
      }
      
      // Phone detection (starts with digit or parenthesis)
      if (part.match(/^[\d(]/)) {
        if (!phone) phone = part;
        continue;
      }
      
      // Email detection
      if (part.includes('@')) {
        email = part;
        continue;
      }
      
      // Address detection (contains street indicators or city/state)
      if (part.match(/\d+\s+\w+|Blvd|Ave|St,|CA\s+\d{5}/i)) {
        address = part;
        continue;
      }
      
      // Notes
      if (part === 'NOTES') {
        continue;
      }
    }
    
    if (name && name.length > 2 && !name.match(/^https?:/)) {
      businesses.push({
        name: name.replace(/['"]/g, "''"),
        businessType: businessType || 'Other',
        phone: phone || null,
        email: email || null,
        address: address ? address.replace(/['"]/g, "''") : null,
        zone: zone || null,
        priority: priority || null,
        notes: notes ? notes.replace(/['"]/g, "''") : null
      });
    }
  }
  
  // Deduplicate by name
  const seen = new Set();
  const unique = businesses.filter(b => {
    const key = b.name.toLowerCase().trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  
  console.log(JSON.stringify(unique, null, 2));
}).catch(err => console.error(err));
