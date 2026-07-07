const crypto = require('crypto');
require('dotenv').config({ override: true });

try {
  const creds = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);
  const pk = creds.private_key;
  
  const base64 = pk
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s+/g, '');
    
  const buffer = Buffer.from(base64, 'base64');
  
  // Append 0x6c to the buffer
  const fixedBuffer = Buffer.concat([buffer, Buffer.from([0x6c])]);
  console.log('Fixed buffer length:', fixedBuffer.length);
  
  try {
    const key = crypto.createPrivateKey({
      key: fixedBuffer,
      format: 'der',
      type: 'pkcs8'
    });
    console.log('SUCCESS!!! The fixed private key is 100% valid and parsed successfully!');
    
    // Derive public key and test signature
    const pubKey = crypto.createPublicKey(key);
    const sign = crypto.createSign('SHA256');
    sign.update('hello');
    const signature = sign.sign(key);
    
    const verify = crypto.createVerify('SHA256');
    verify.update('hello');
    const isValid = verify.verify(pubKey, signature);
    console.log('Signature mathematically verified with derived public key:', isValid);
    
    // Format as PEM
    const pem = `-----BEGIN PRIVATE KEY-----\n${fixedBuffer.toString('base64').match(/.{1,64}/g).join('\n')}\n-----END PRIVATE KEY-----\n`;
    console.log('\nGenerated PEM is valid:', !!crypto.createPrivateKey(pem));
  } catch (err) {
    console.error('Failed to parse fixed key:', err.message);
  }
} catch (e) {
  console.error(e);
}
