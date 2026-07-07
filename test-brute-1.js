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
  
  console.log('--- Checking 1 extra character additions ---');
  let found1 = [];
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
      console.log(`FOUND VALID KEY (1 addition): "${char}"`);
      found1.push(char);
    } catch (err) {
      // failed
    }
  }

  console.log('\n--- Checking replacing the last character ---');
  let foundReplace = [];
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
      console.log(`FOUND VALID KEY (replace): "${char}"`);
      foundReplace.push(char);
    } catch (err) {
      // failed
    }
  }

} catch (e) {
  console.error(e);
}
