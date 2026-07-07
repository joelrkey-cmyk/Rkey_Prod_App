const crypto = require('crypto');
require('dotenv').config({ override: true });

try {
  const creds = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);
  const pk = creds.private_key;
  
  const base64 = pk
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s+/g, '');
    
  const base64NoPadding = base64.replace(/=+$/, '');
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  
  console.log('Testing signing with 1-character additions...');
  let mathValid = [];
  for (let i = 0; i < alphabet.length; i++) {
    const char = alphabet[i];
    const candidateBase64 = base64NoPadding + char + '=';
    const buffer = Buffer.from(candidateBase64, 'base64');
    try {
      const key = crypto.createPrivateKey({
        key: buffer,
        format: 'der',
        type: 'pkcs8'
      });
      
      // Try to sign a message to trigger mathematical validation in OpenSSL
      const sign = crypto.createSign('SHA256');
      sign.update('hello');
      const signature = sign.sign(key);
      
      console.log(`MATHEMATICALLY VALID KEY FOUND! Character: "${char}"`);
      mathValid.push({ char, base64: candidateBase64 });
    } catch (err) {
      // signing failed or key creation failed
    }
  }
  
  console.log('\nMathematically valid count:', mathValid.length);
} catch (e) {
  console.error(e);
}
