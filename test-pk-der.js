require('dotenv').config({ override: true });

try {
  const creds = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);
  const pk = creds.private_key;
  
  const base64 = pk
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s+/g, '');
    
  console.log('Base64 length:', base64.length);
  const buffer = Buffer.from(base64, 'base64');
  console.log('DER buffer length:', buffer.length);
  
  // A standard PKCS#8 RSA private key starts with 0x30 (Sequence)
  console.log('First 10 bytes:', buffer.subarray(0, 10));
} catch (e) {
  console.error('Error:', e.message);
}
