const fs = require('fs');
require('dotenv').config({ override: true });

try {
  const creds = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);
  const pk = creds.private_key;
  
  const base64 = pk
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s+/g, '');
    
  const buffer = Buffer.from(base64, 'base64');
  const fixedBuffer = Buffer.concat([buffer, Buffer.from([0x6c])]);
  
  const fixedBase64 = fixedBuffer.toString('base64');
  console.log('Original base64 ends with:', base64.substring(base64.length - 40));
  console.log('Fixed base64 ends with:   ', fixedBase64.substring(fixedBase64.length - 40));
  
  // Find where it differs or what is the correct replacement
  console.log('\nLast line comparison:');
  const origLines = base64.match(/.{1,64}/g);
  const fixedLines = fixedBase64.match(/.{1,64}/g);
  console.log('Orig last line: ', origLines[origLines.length - 1]);
  console.log('Fixed last line:', fixedLines[fixedLines.length - 1]);
} catch (e) {
  console.error(e);
}
