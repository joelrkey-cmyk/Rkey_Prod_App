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
  
  console.log('Testing signature verification with 1-character additions...');
  let verifiedCount = 0;
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
      
      // Try to sign a message
      const sign = crypto.createSign('SHA256');
      sign.update('hello');
      const signature = sign.sign(key);
      
      // Derive public key from private key
      const pubKey = crypto.createPublicKey(key);
      
      // Verify signature
      const verify = crypto.createVerify('SHA256');
      verify.update('hello');
      const isValid = verify.verify(pubKey, signature);
      
      if (isValid) {
        console.log(`VERIFIED SIGNATURE FOUND! Character: "${char}"`);
        verifiedCount++;
      }
    } catch (err) {
      // failed
    }
  }
  
  console.log('\nVerified count:', verifiedCount);
} catch (e) {
  console.error(e);
}
