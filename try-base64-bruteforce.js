const crypto = require('crypto');
require('dotenv').config({ override: true });

try {
  const creds = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);
  const pk = creds.private_key;
  
  const base64 = pk
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s+/g, '');
    
  // The base64 without padding:
  const base64NoPadding = base64.replace(/=+$/, '');
  console.log('Original base64 without padding length:', base64NoPadding.length);
  
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  
  // 1. Try appending 1 character + padding to make it a multiple of 4
  console.log('\n--- Brute forcing 1 extra character ---');
  let found = [];
  for (let i = 0; i < alphabet.length; i++) {
    const char = alphabet[i];
    const candidateBase64 = base64NoPadding + char + '=';
    const buffer = Buffer.from(candidateBase64, 'base64');
    try {
      crypto.createPrivateKey({
        key: buffer,
        format: 'der',
        type: 'pkcs8'
      });
      console.log(`FOUND VALID KEY! Added character: "${char}"`);
      found.push(candidateBase64);
    } catch (err) {
      // failed, ignore
    }
  }

  // 2. Try replacing the last character
  console.log('\n--- Brute forcing replacing the last character ---');
  const base64Minus1 = base64NoPadding.substring(0, base64NoPadding.length - 1);
  for (let i = 0; i < alphabet.length; i++) {
    const char = alphabet[i];
    const candidateBase64 = base64Minus1 + char + '=';
    const buffer = Buffer.from(candidateBase64, 'base64');
    try {
      crypto.createPrivateKey({
        key: buffer,
        format: 'der',
        type: 'pkcs8'
      });
      console.log(`FOUND VALID KEY! Replaced last character with: "${char}"`);
      found.push(candidateBase64);
    } catch (err) {
      // failed
    }
  }

  // 3. Try adding 2 characters
  console.log('\n--- Brute forcing adding 2 characters ---');
  for (let i = 0; i < alphabet.length; i++) {
    for (let j = 0; j < alphabet.length; j++) {
      const char1 = alphabet[i];
      const char2 = alphabet[j];
      const candidateBase64 = base64NoPadding + char1 + char2;
      const buffer = Buffer.from(candidateBase64, 'base64');
      try {
        crypto.createPrivateKey({
          key: buffer,
          format: 'der',
          type: 'pkcs8'
        });
        console.log(`FOUND VALID KEY! Added two characters: "${char1}${char2}"`);
        found.push(candidateBase64);
      } catch (err) {
        // failed
      }
    }
  }

  console.log('\nBrute-force finished. Found count:', found.length);

} catch (e) {
  console.error(e);
}
