const crypto = require('crypto');
require('dotenv').config();

let jsonStr = process.env.GOOGLE_CREDENTIALS_JSON;
if (require('fs').existsSync('google-credentials.json')) {
  jsonStr = require('fs').readFileSync('google-credentials.json', 'utf8');
}

if (!jsonStr) {
  console.error('No credentials string found in environment or file!');
  process.exit(1);
}

const creds = JSON.parse(jsonStr);
const pk = creds.private_key;

console.log('Private key length:', pk.length);
console.log('First 50 characters:', JSON.stringify(pk.substring(0, 50)));
console.log('Last 50 characters:', JSON.stringify(pk.substring(pk.length - 50)));

// Try standard parse
try {
  crypto.createPrivateKey(pk);
  console.log('SUCCESS: Standard parsing works!');
} catch (e) {
  console.error('ERROR: Standard parsing failed:', e.message);
}

// Clean and rebuild PKCS#8 key
const cleanB64 = pk
  .replace(/-----BEGIN PRIVATE KEY-----/g, '')
  .replace(/-----END PRIVATE KEY-----/g, '')
  .replace(/\s+/g, '');

console.log('Clean base64 length:', cleanB64.length);

try {
  const buf = Buffer.from(cleanB64, 'base64');
  console.log('Decoded buffer length:', buf.length);
  
  // Re-encode with explicit formatting
  const formattedKey = '-----BEGIN PRIVATE KEY-----\n' + 
    buf.toString('base64').match(/.{1,64}/g).join('\n') + 
    '\n-----END PRIVATE KEY-----\n';
    
  crypto.createPrivateKey(formattedKey);
  console.log('SUCCESS: Re-encoded PKCS#8 parsed successfully!');
} catch (e) {
  console.error('ERROR: Re-encoded PKCS#8 failed:', e.message);
}

// Try treating as PKCS#1 (RSA Private Key)
try {
  const formattedRSAKey = '-----BEGIN RSA PRIVATE KEY-----\n' + 
    cleanB64.match(/.{1,64}/g).join('\n') + 
    '\n-----END RSA PRIVATE KEY-----\n';
  crypto.createPrivateKey(formattedRSAKey);
  console.log('SUCCESS: Parsed as PKCS#1 (RSA Private Key)!');
} catch (e) {
  console.error('ERROR: PKCS#1 failed:', e.message);
}
