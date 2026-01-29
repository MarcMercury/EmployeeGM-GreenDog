const PDFParser = require('pdf2json');
const fs = require('fs');
const buffer = fs.readFileSync('./public/Referrer Revenue-EXAMPLE.pdf');
const pdfParser = new PDFParser();

const DATE_COL_MIN = 3;
const DATE_COL_MAX = 7;
const CLINIC_COL_MIN = 9;
const CLINIC_COL_MAX = 15;
const VET_COL_MIN = 16;
const VET_COL_MAX = 22;

function cleanClinicName(name) {
  let cleaned = name.toLowerCase().trim();
  cleaned = cleaned.replace(/^\d+\s+/, '');
  return cleaned.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ').trim();
}

pdfParser.on('pdfParser_dataReady', (pdfData) => {
  const visits = [];
  const amounts = [];
  let foundAmountHeader = false;
  
  for (let pageIdx = 0; pageIdx < pdfData.Pages.length; pageIdx++) {
    const page = pdfData.Pages[pageIdx];
    const pageItems = [];
    
    for (const t of page.Texts || []) {
      for (const r of t.R || []) {
        if (r.T) {
          const text = decodeURIComponent(r.T).trim();
          if (text) pageItems.push({ text, y: t.y, x: t.x || 0 });
        }
      }
    }
    
    // Check for Amount header
    if (pageItems.some(item => item.text === 'Amount')) {
      foundAmountHeader = true;
      console.log('Found Amount header on page', pageIdx + 1);
    }
    
    if (foundAmountHeader) {
      // Extract amounts
      for (const item of pageItems) {
        const numMatch = item.text.match(/^-?\d+(?:\.\d{1,2})?$/);
        if (numMatch) {
          const val = parseFloat(item.text);
          if (!isNaN(val)) amounts.push(val);
        }
      }
    } else {
      const rowMap = new Map();
      for (const item of pageItems) {
        const yKey = Math.round(item.y * 10);
        const row = rowMap.get(yKey) || [];
        row.push({ text: item.text, x: item.x });
        rowMap.set(yKey, row);
      }
      
      for (const [yKey, rowItems] of rowMap) {
        rowItems.sort((a, b) => a.x - b.x);
        
        const dateItem = rowItems.find(item =>
          item.x >= DATE_COL_MIN && item.x <= DATE_COL_MAX &&
          /^\d{2}-\d{2}-\d{4}\s+\d{1,2}:\d{2}[ap]m$/i.test(item.text)
        );
        
        if (dateItem) {
          const clinicItem = rowItems.find(item =>
            item.x >= CLINIC_COL_MIN && item.x <= CLINIC_COL_MAX &&
            item.text.length > 3 &&
            !/^\d{2}-\d{2}-\d{4}/.test(item.text)
          );
          
          // Also find vet column item
          const vetItem = rowItems.find(item =>
            item.x >= VET_COL_MIN && item.x <= VET_COL_MAX &&
            item.text.length > 3 &&
            !/^\d{2}-\d{2}-\d{4}/.test(item.text)
          );
          
          const dateMatch = dateItem.text.match(/^(\d{2}-\d{2}-\d{4})/);
          const date = dateMatch ? dateMatch[1] : '';
          
          if (clinicItem) {
            let clinicName = clinicItem.text.trim();
            let isUnknown = clinicName.toLowerCase().includes('unknown clinic') ||
                            clinicName.toLowerCase() === 'unknown';
            
            // FALLBACK: If referring clinic is "Unknown Clinic" but vet column has real clinic
            if (isUnknown && vetItem) {
              const vetText = vetItem.text.trim().toLowerCase();
              const isVetUnknown = vetText === 'unknown vet' || vetText === 'unknown' ||
                                   vetText.includes('unknown vet');
              
              if (!isVetUnknown) {
                clinicName = vetItem.text.trim();
                isUnknown = false;
              }
            }
            
            visits.push({ date, clinicName: cleanClinicName(clinicName), isUnknown });
          } else {
            visits.push({ date, clinicName: 'MISSING_CLINIC', isUnknown: true });
          }
        }
      }
    }
  }
  
  // Remove grand total from amounts
  if (amounts.length > 1) {
    const sorted = [...amounts].sort((a, b) => b - a);
    if (sorted[0] > sorted[1] * 10 && sorted[0] > 100000) {
      const idx = amounts.indexOf(sorted[0]);
      console.log('Removing grand total:', sorted[0]);
      amounts.splice(idx, 1);
    }
  }
  
  const knownVisitsArr = visits.filter(v => !v.isUnknown);
  const unknownVisitsArr = visits.filter(v => v.isUnknown);
  const missingClinic = visits.filter(v => v.clinicName === 'MISSING_CLINIC');
  const totalRevenue = amounts.reduce((a, b) => a + b, 0);
  
  console.log('\n=== RESULTS ===');
  console.log('Total visits:', visits.length);
  console.log('Known clinic visits:', knownVisitsArr.length);
  console.log('Unknown/vet visits:', unknownVisitsArr.length);
  console.log('Missing clinic (bug):', missingClinic.length);
  console.log('Amount entries:', amounts.length);
  console.log('Total revenue: $' + totalRevenue.toLocaleString());
  
  // Aggregate by clinic - only known clinics
  const clinicStats = new Map();
  let unknownRevenue = 0;
  let unknownVisits = 0;
  
  for (let i = 0; i < visits.length; i++) {
    const v = visits[i];
    const amount = i < amounts.length ? amounts[i] : 0;
    
    if (v.isUnknown) {
      unknownRevenue += amount;
      unknownVisits++;
    } else {
      const key = v.clinicName;
      const stats = clinicStats.get(key) || { visits: 0, revenue: 0 };
      stats.visits++;
      stats.revenue += amount;
      clinicStats.set(key, stats);
    }
  }
  
  console.log('\nUnknown Clinic summary:', unknownVisits, 'visits, $' + unknownRevenue.toLocaleString());
  
  // Sort by visits and show top 20
  const sorted = [...clinicStats.entries()].sort((a, b) => b[1].visits - a[1].visits);
  const totalKnownRevenue = sorted.reduce((sum, [, s]) => sum + s.revenue, 0);
  console.log('\nKnown clinics total revenue: $' + totalKnownRevenue.toLocaleString());
  console.log('Top 20 known clinics by visits:');
  sorted.slice(0, 20).forEach(([name, stats]) => {
    console.log(`  ${name}: ${stats.visits} visits, $${stats.revenue.toLocaleString()}`);
  });
});

pdfParser.parseBuffer(buffer);
