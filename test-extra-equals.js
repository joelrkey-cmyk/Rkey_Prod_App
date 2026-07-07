const crypto = require('crypto');
require('dotenv').config({ override: true });

try {
  const creds = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);
  let pk = creds.private_key;
  
  // Try adding another = at the end of the base64 part
  const base64 = pk
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s+/g, '');
    
  console.log('Original base64 ends with:', base64.substring(base64.length - 10));
  
  // Try appending '=' or changing padding
  const base64WithExtraEquals = base64.replace(/=+$/, '') + '==';
  console.log('Modified base64 length:', base64WithExtraEquals.length);
  
  const buffer = Buffer.from(base64WithExtraEquals, 'base64');
  console.log('Modified DER buffer length:', buffer.length);
  console.log('First 10 bytes:', buffer.subarray(0, 10));
  
  try {
    const key = crypto.createPrivateKey({
      key: buffer,
      format: 'der',
      type: 'pkcs8'
    });
    console.log('SUCCESS! Modified DER PKCS8 key parsed successfully!');
  } catch (err) {
    console.error('Modified DER PKCS8 key parse failed:', err.message);
  }

} catch (e) {
  console.error(e);
}
