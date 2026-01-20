const fs = require('fs');
const { PDFParse } = require('pdf-parse');

const dataBuffer = fs.readFileSync('./public/Marketing Spreadsheets.pdf');

// PDFParse requires options with data property
const parser = new PDFParse({ data: dataBuffer });
parser.getText().then(function(result) {
  console.log('Number of pages:', result.total);
  console.log('\n=== FULL TEXT ===\n');
  console.log(result.text);
}).catch(err => console.error('Error:', err));
